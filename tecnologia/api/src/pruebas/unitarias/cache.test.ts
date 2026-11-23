import { Cache } from '../../shared/dominio/cache';
import { CacheMemoria, SinCache } from '../../shared/infraestructura/cache-memoria';
import { Cita } from '../../modules/citas/dominio/cita';
import { Cupo, DatosCupo } from '../../modules/citas/dominio/cupo';
import { CitasMemoriaRepository, CuposMemoriaRepository } from '../../modules/citas';
import { CitasConInvalidacionRepository, CuposConCacheRepository, claveCuposDelDia } from '../../modules/citas/infraestructura/cache-cupos';
import { Dni } from '../../shared/dominio/dni';

// ADR-004 · Estrategia de caché (cache-aside) para la consulta de disponibilidad.

const AHORA = new Date('2026-11-04T10:00:00-05:00');
const cupo = (id: string, hora: string, dia = '2026-11-05'): DatosCupo => ({
  id, establecimientoId: 'hra', especialidadId: 'ped', consultorio: 'Consultorio 3', medico: 'Dra. Ana Torres',
  fechaHora: new Date(`${dia}T${hora}:00-05:00`), duracionMin: 20, estado: 'DISPONIBLE',
});
const DIA = { desde: new Date('2026-11-05T00:00:00-05:00'), hasta: new Date('2026-11-06T00:00:00-05:00') };

/** Repositorio de cupos que cuenta cuántas veces se consulta la "base de datos". */
function entorno(cache: Cache = new CacheMemoria()) {
  const base = new CuposMemoriaRepository([cupo('c1', '08:00'), cupo('c2', '08:20'), cupo('c3', '09:00'), cupo('c4', '08:00', '2026-11-06')]);
  const consultas = { n: 0 };
  const original = base.disponibles.bind(base);
  base.disponibles = (...a) => { consultas.n++; return original(...a); };
  const cupos = new CuposConCacheRepository(base, cache);
  const citas = new CitasConInvalidacionRepository(new CitasMemoriaRepository(base), cache);
  return { base, cupos, citas, cache, consultas };
}
const ids = (lista: Cupo[]) => lista.map((c) => c.id);
const reservar = async (e: ReturnType<typeof entorno>, cupoId: string, pacienteId = 'p1') => {
  const c = (await e.cupos.buscarPorId(cupoId))!;
  const cita = Cita.reservar({ pacienteId, dni: new Dni('70000001'), cupo: c, ahora: AHORA, yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0 });
  await e.citas.guardarReserva(cita);
  return cita;
};

describe('CacheMemoria', () => {
  test('guarda una copia serializada y la entrada vence con el TTL', async () => {
    let ahora = 0;
    const cache = new CacheMemoria(() => ahora);
    const valor = { a: [1, 2] };
    await cache.guardar('k', valor, 60);
    valor.a.push(3);
    expect(await cache.obtener('k')).toEqual({ a: [1, 2] });
    ahora = 60_000;
    expect(await cache.obtener('k')).toBeNull();
    expect(cache.estadisticas()).toMatchObject({ tipo: 'memoria', aciertos: 1, fallos: 1, tasaAciertos: 0.5 });
  });
});

describe('CuposConCacheRepository (cache-aside)', () => {
  test('la primera consulta del día va a la BD (MISS) y la segunda sale de la caché (HIT)', async () => {
    const e = entorno();
    expect(ids(await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta))).toEqual(['c1', 'c2', 'c3']);
    expect(ids(await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta))).toEqual(['c1', 'c2', 'c3']);
    expect(e.consultas.n).toBe(1);
    expect(e.cache.estadisticas()).toMatchObject({ aciertos: 1, fallos: 1 });
  });

  test('la clave es por día: consultas a distintas horas del mismo día reutilizan la caché', async () => {
    const e = entorno();
    await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta);
    const despuesDeLas8 = new Date('2026-11-05T08:10:00-05:00');
    expect(ids(await e.cupos.disponibles('ped', 'hra', despuesDeLas8, DIA.hasta))).toEqual(['c2', 'c3']);
    expect(e.consultas.n).toBe(1);
  });

  test('un rango de varios días combina una clave por día, ordenadas por hora', async () => {
    const e = entorno();
    const r = await e.cupos.disponibles('ped', 'hra', DIA.desde, new Date('2026-11-07T00:00:00-05:00'));
    expect(ids(r)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(r[0].fechaHora).toBeInstanceOf(Date);
    expect(e.consultas.n).toBe(2);
  });

  test('al reservar se invalida la clave del día y el cupo ocupado deja de aparecer (RN-01)', async () => {
    const e = entorno();
    await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta);
    await reservar(e, 'c2');
    expect(ids(await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta))).toEqual(['c1', 'c3']);
    expect(e.consultas.n).toBe(2);
    expect(e.cache.estadisticas().invalidaciones).toBe(1);
  });

  test('al cancelar se invalida la clave y el cupo vuelve a estar libre', async () => {
    const e = entorno();
    const cita = await reservar(e, 'c2');
    expect(ids(await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta))).toEqual(['c1', 'c3']);
    cita.cancelar(AHORA);
    await e.citas.actualizar(cita);
    expect(ids(await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta))).toEqual(['c1', 'c2', 'c3']);
  });

  test('si otro paciente ganó el cupo (409) también se invalida la caché', async () => {
    const e = entorno();
    await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta);
    const c = (await e.base.buscarPorId('c1'))!;
    await reservar(e, 'c1', 'p1');
    const tarde = Cita.reservar({ pacienteId: 'p2', dni: new Dni('70000002'), cupo: c, ahora: AHORA, yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0 });
    await expect(e.citas.guardarReserva(tarde)).rejects.toMatchObject({ codigo: 'CUPO_NO_DISPONIBLE' });
    expect(e.cache.estadisticas().invalidaciones).toBe(2);
  });

  test('si la caché falla, responde igual desde la base de datos (EQ-02)', async () => {
    const rota: Cache = {
      tipo: 'redis',
      obtener: async () => { throw new Error('ECONNREFUSED'); },
      guardar: async () => { throw new Error('ECONNREFUSED'); },
      borrar: async () => { throw new Error('ECONNREFUSED'); },
      estadisticas: () => new SinCache().estadisticas(),
    };
    const e = entorno(rota);
    expect(ids(await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta))).toEqual(['c1', 'c2', 'c3']);
    await expect(reservar(e, 'c3')).resolves.toBeDefined();
  });

  test('con la caché desactivada siempre consulta la base de datos', async () => {
    const e = entorno(new SinCache());
    await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta);
    await e.cupos.disponibles('ped', 'hra', DIA.desde, DIA.hasta);
    expect(e.consultas.n).toBe(2);
  });

  test('la clave identifica especialidad, establecimiento y día', () => {
    expect(claveCuposDelDia('ped', 'hra', '2026-11-05')).toBe('cupos:ped:hra:2026-11-05');
  });
});
