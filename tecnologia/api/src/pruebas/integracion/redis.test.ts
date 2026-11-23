import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { Cita } from '../../modules/citas/dominio/cita';
import { Dni } from '../../shared/dominio/dni';
import { CuposPostgresRepository, CitasPostgresRepository } from '../../modules/citas';
import { CitasConInvalidacionRepository, CuposConCacheRepository } from '../../modules/citas/infraestructura/cache-cupos';
import { CacheRedis } from '../../shared/infraestructura/cache-redis';
import { migrar } from '../../db/migrador';

// ADR-004 con Redis y PostgreSQL reales (docker compose). Requiere REDIS_URL además de DATABASE_URL.

const env = process.env;
const conRedis = env.REDIS_URL && env.DATABASE_URL && env.INTEGRACION_BD_DESECHABLE === 'true' ? describe : describe.skip;

conRedis('Caché Redis de cupos (ADR-004)', () => {
  let bd: Pool;
  let cache: CacheRedis;

  beforeAll(async () => {
    bd = new Pool({ connectionString: env.DATABASE_URL });
    await migrar(bd);
    cache = await new CacheRedis(env.REDIS_URL!, `prueba-${Date.now()}:`).conectar();
  });
  afterAll(async () => {
    await cache.cerrar();
    await bd.end();
  });

  test('la segunda lectura del mismo día sale de Redis y es más rápida que PostgreSQL', async () => {
    const { rows } = await bd.query(`SELECT especialidad_id, establecimiento_id, fecha_hora FROM cupos WHERE estado = 'DISPONIBLE' AND fecha_hora > now() + interval '1 day' ORDER BY fecha_hora LIMIT 1`);
    const { especialidad_id: esp, establecimiento_id: est, fecha_hora: hora } = rows[0];
    const desde = new Date(hora.getTime() - 3600_000);
    const hasta = new Date(hora.getTime() + 3600_000);
    const cupos = new CuposConCacheRepository(new CuposPostgresRepository(bd), cache);

    const t0 = performance.now();
    const primera = await cupos.disponibles(esp, est, desde, hasta);
    const t1 = performance.now();
    const segunda = await cupos.disponibles(esp, est, desde, hasta);
    const t2 = performance.now();

    expect(segunda.map((c) => c.id)).toEqual(primera.map((c) => c.id));
    expect(cache.estadisticas()).toMatchObject({ tipo: 'redis', aciertos: 1, fallos: 1 });
    console.log(`MISS (PostgreSQL): ${(t1 - t0).toFixed(1)} ms · HIT (Redis): ${(t2 - t1).toFixed(1)} ms`);
  });

  test('reservar en PostgreSQL invalida la clave en Redis y el cupo deja de listarse', async () => {
    const cupos = new CuposConCacheRepository(new CuposPostgresRepository(bd), cache);
    const citas = new CitasConInvalidacionRepository(new CitasPostgresRepository(bd), cache);
    const { rows } = await bd.query(`SELECT id, especialidad_id, establecimiento_id, fecha_hora FROM cupos WHERE estado = 'DISPONIBLE' AND fecha_hora > now() + interval '2 day' ORDER BY fecha_hora LIMIT 1`);
    const { id, especialidad_id: esp, establecimiento_id: est, fecha_hora: hora } = rows[0];
    const rango = [new Date(hora.getTime() - 60_000), new Date(hora.getTime() + 60_000)] as const;

    expect((await cupos.disponibles(esp, est, ...rango)).map((c) => c.id)).toContain(id);
    const cita = Cita.reservar({
      pacienteId: randomUUID(), dni: new Dni('70000002'), cupo: (await cupos.buscarPorId(id))!, ahora: new Date(),
      yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0,
    });
    await citas.guardarReserva(cita);
    expect((await cupos.disponibles(esp, est, ...rango)).map((c) => c.id)).not.toContain(id);
    expect(cache.estadisticas().invalidaciones).toBeGreaterThanOrEqual(1);
  });
});
