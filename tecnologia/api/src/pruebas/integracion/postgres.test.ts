import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { Pool } from 'pg';
import { crearApp, Infraestructura } from '../../app';
import { migrar } from '../../db/migrador';
import { crearInfraestructuraPostgres } from '../../infraestructura';
import { Cita } from '../../modules/citas/dominio/cita';
import { CitasPostgresRepository, CuposPostgresRepository, PersonalPostgresRepository } from '../../modules/citas';
import { diaEnLima } from '../../shared/dominio/fecha-lima';
import { Dni } from '../../shared/dominio/dni';
import { DATOS_JOSE, DATOS_MARIA, entrar, llamar } from '../ayudantes';

// Pruebas de integración: API + PostgreSQL + simuladores reales (docker compose).
// BORRAN las tablas de usuarios y citas: solo se ejecutan contra una base desechable.
//   INTEGRACION_BD_DESECHABLE=true DATABASE_URL=... PIDE_URL=... SMS_URL=... npm run test:integracion

const env = process.env;
if (env.INTEGRACION_BD_DESECHABLE !== 'true' || !env.DATABASE_URL) {
  throw new Error('Define INTEGRACION_BD_DESECHABLE=true y DATABASE_URL (base de pruebas) para las pruebas de integración');
}
const SMS_URL = env.SMS_URL ?? 'http://localhost:4002';

describe('Integración con PostgreSQL y simuladores', () => {
  let bd: Pool;
  let infra: Infraestructura;
  let servidor: Server;
  let url: string;

  beforeAll(async () => {
    bd = new Pool({ connectionString: env.DATABASE_URL });
    await migrar(bd);
    await bd.query('TRUNCATE citas, codigos_recuperacion, usuarios');
    infra = await crearInfraestructuraPostgres({
      jwtSecreto: 'secreto-de-integracion-con-mas-de-32-caracteres',
      pide: { url: env.PIDE_URL ?? 'http://localhost:4001', usuario: env.PIDE_USUARIO ?? '40000000', password: env.PIDE_PASSWORD ?? 'clave-entidad' },
      sms: { url: SMS_URL, apiKey: env.SMS_API_KEY ?? 'clave-sms-local' },
      costoBcrypt: 4,
    }, bd);
    servidor = await new Promise((listo) => {
      const s = crearApp(infra).listen(0, () => listo(s));
    });
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((fin) => servidor.close(fin));
    await bd.end();
  });

  /** Primer cupo libre de mañana en adelante para una oferta. */
  const cupoLibre = async (token: string, especialidadId: string, establecimientoId: string, saltar = 0) => {
    const consulta = `especialidadId=${especialidadId}&establecimientoId=${establecimientoId}`;
    const fechas = (await llamar(url, 'GET', `/api/v1/citas/cupos/fechas?${consulta}`, undefined, token)).cuerpo as string[];
    const cupos = (await llamar(url, 'GET', `/api/v1/citas/cupos?${consulta}&fecha=${fechas[1 + saltar]}`, undefined, token)).cuerpo;
    return cupos[0].id as string;
  };

  test('las migraciones son idempotentes', async () => {
    expect(await migrar(bd)).toEqual([]);
  });

  test('flujo completo: crear cuenta con RENIEC simulado, reservar y recibir el SMS (CA-002-1, CA-005-1, CA-005-2)', async () => {
    await fetch(`${SMS_URL}/v1/mensajes`, { method: 'DELETE' });
    const token = await entrar(url, DATOS_MARIA);

    const cupoId = await cupoLibre(token, 'ped', 'hra');
    const reserva = await llamar(url, 'POST', '/api/v1/citas', { cupoId }, token);
    expect(reserva.estado).toBe(201);
    expect(reserva.cuerpo.notificacion).toBe('ENVIADA');

    const bandeja = await (await fetch(`${SMS_URL}/v1/mensajes?telefono=%2B51987654321`)).json();
    expect(bandeja.some((m: any) => m.texto.includes(reserva.cuerpo.codigo))).toBeTruthy();

    const mias = await llamar(url, 'GET', '/api/v1/citas/mias', undefined, token);
    expect(mias.cuerpo.map((c: any) => c.codigo)).toEqual([reserva.cuerpo.codigo]);

    const { rows } = await bd.query('SELECT hash_contrasena FROM usuarios WHERE dni = $1', ['70000001']);
    expect(rows[0].hash_contrasena).toMatch(/^\$2[aby]\$/);
  });

  test('HU11 con PostgreSQL y el SMS real: el código llega a la bandeja y cambia la contraseña (CA-002-10)', async () => {
    await entrar(url, DATOS_JOSE);
    await fetch(`${SMS_URL}/v1/mensajes`, { method: 'DELETE' });
    const solicitud = await llamar(url, 'POST', '/api/v1/identidad/recuperacion', { numeroDocumento: DATOS_JOSE.dni });
    expect(solicitud.estado).toBe(202);
    expect(solicitud.cuerpo.celular).toBe('*****5678');

    const bandeja = await (await fetch(`${SMS_URL}/v1/mensajes?telefono=%2B51912345678`)).json();
    const codigo = bandeja.map((m: any) => /\b(\d{6})\b/.exec(m.texto)?.[1]).find(Boolean);
    expect(codigo).toMatch(/^\d{6}$/);
    const { rows } = await bd.query('SELECT hash_codigo FROM codigos_recuperacion cr JOIN usuarios u ON u.id = cr.usuario_id WHERE u.dni = $1', [DATOS_JOSE.dni]);
    expect(rows[0].hash_codigo).not.toBe(codigo);

    const nueva = 'NuevaClave2026';
    const confirmar = await llamar(url, 'POST', '/api/v1/identidad/recuperacion/confirmar', { numeroDocumento: DATOS_JOSE.dni, codigo, nuevaContrasena: nueva });
    expect(confirmar.estado).toBe(204);
    expect((await bd.query('SELECT count(*)::int AS total FROM codigos_recuperacion')).rows[0].total).toBe(0);
    const sesion = await llamar(url, 'POST', '/api/v1/identidad/sesion', { numeroDocumento: DATOS_JOSE.dni, contrasena: nueva });
    expect(sesion.estado).toBe(200);

    // Las pruebas siguientes entran con la contraseña de DATOS_JOSE: se restituye.
    await bd.query('UPDATE usuarios SET hash_contrasena = $2 WHERE dni = $1', [DATOS_JOSE.dni, await infra.hasheador.hashear(DATOS_JOSE.contrasena)]);
  });

  test('CA-005-5: dos pacientes piden el mismo cupo a la vez y solo uno lo obtiene', async () => {
    const maria = await entrar(url, DATOS_MARIA);
    const jose = await entrar(url, DATOS_JOSE);
    const cupoId = await cupoLibre(maria, 'mg', 'hra');
    const respuestas = await Promise.all([
      llamar(url, 'POST', '/api/v1/citas', { cupoId }, maria),
      llamar(url, 'POST', '/api/v1/citas', { cupoId }, jose),
    ]);
    expect(respuestas.map((r) => r.estado).sort()).toEqual([201, 409]);
    const { rows } = await bd.query('SELECT count(*)::int AS total FROM citas WHERE cupo_id = $1', [cupoId]);
    expect(rows[0].total).toBe(1);
  });

  test('RN-11 en el repositorio: de 10 reservas simultáneas del mismo cupo solo 1 se guarda', async () => {
    const cupos = new CuposPostgresRepository(bd);
    const citas = new CitasPostgresRepository(bd);
    const token = await entrar(url, DATOS_JOSE);
    const cupoId = await cupoLibre(token, 'gin', 'hah');

    const intentos = await Promise.allSettled(
      Array.from({ length: 10 }, async () => {
        const cupo = (await cupos.buscarPorId(cupoId))!;
        const cita = Cita.reservar({
          pacienteId: randomUUID(), dni: new Dni('70000002'), cupo, ahora: new Date(),
          yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0,
        });
        await citas.guardarReserva(cita);
      }),
    );
    expect(intentos.filter((r) => r.status === 'fulfilled').length).toBe(1);
    for (const r of intentos.filter((r): r is PromiseRejectedResult => r.status === 'rejected')) {
      expect(r.reason.codigo).toBe('CUPO_NO_DISPONIBLE');
    }
  });

  test('RN-02 en la base: dos reservas simultáneas del mismo paciente, especialidad y día', async () => {
    const cupos = new CuposPostgresRepository(bd);
    const citas = new CitasPostgresRepository(bd);
    const token = await entrar(url, DATOS_JOSE);
    const primero = await cupoLibre(token, 'odo', 'csjb', 2);
    const cupoA = (await cupos.buscarPorId(primero))!;
    const libres = await cupos.disponibles('odo', 'csjb', cupoA.fechaHora, new Date(cupoA.fechaHora.getTime() + 6 * 3600_000));
    const cupoB = libres[0];

    const pacienteId = randomUUID();
    const reservar = (cupo: typeof cupoA) => citas.guardarReserva(Cita.reservar({
      pacienteId, dni: new Dni('70000002'), cupo, ahora: new Date(),
      yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0,
    }));
    const resultados = await Promise.allSettled([reservar(cupoA), reservar(cupoB)]);
    const rechazos = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rechazos.length).toBe(1);
    expect(rechazos[0].reason.codigo).toBe('CITA_DUPLICADA');

    // El cupo del intento rechazado no quedó ocupado (la transacción se deshizo)
    const estados = await Promise.all([cupoA.id, cupoB.id].map(async (id) => (await cupos.buscarPorId(id))!.estaDisponible()));
    expect(estados.sort()).toEqual([false, true]);
  });

  test('spec 007: la agenda del día, la búsqueda por código y la hora de llegada se guardan en PostgreSQL', async () => {
    const cupos = new CuposPostgresRepository(bd);
    const citas = new CitasPostgresRepository(bd);
    expect(await new PersonalPostgresRepository(bd).establecimientoDe('70000099')).toBe('hra');
    expect(await new PersonalPostgresRepository(bd).establecimientoDe('70000001')).toBeNull();
    expect((await infra.catalogo.especialidadesDelEstablecimiento('csjb')).map((x) => x.id)).toEqual(['mg', 'odo']);

    const token = await entrar(url, DATOS_JOSE);
    const cupo = (await cupos.buscarPorId(await cupoLibre(token, 'car', 'hra')))!;
    const cita = Cita.reservar({
      pacienteId: randomUUID(), dni: new Dni('70000002'), cupo, ahora: new Date(),
      yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0,
    });
    await citas.guardarReserva(cita);

    const dia = diaEnLima(cupo.fechaHora);
    expect((await citas.delDia('hra', 'car', dia)).map((c) => c.codigo)).toContain(cita.codigo);
    expect(await citas.delDia('hah', 'car', dia)).toEqual([]);

    // Llegada registrada a la hora de la cita (RA-02 y RA-04 se cumplen ese instante)
    const leida = (await citas.buscarPorCodigo(cita.codigo))!;
    leida.registrarLlegada(cupo.fechaHora, 'hra');
    await citas.actualizar(leida);
    expect((await citas.buscarPorId(cita.id))!.llegadaEn?.getTime()).toBe(cupo.fechaHora.getTime());
  });
});
