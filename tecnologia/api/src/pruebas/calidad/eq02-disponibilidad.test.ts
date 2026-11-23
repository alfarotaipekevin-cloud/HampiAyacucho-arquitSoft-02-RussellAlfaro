import { Cache } from '../../shared/dominio/cache';
import { CitasConInvalidacionRepository, CuposConCacheRepository } from '../../modules/citas/infraestructura/cache-cupos';
import { DATOS_MARIA, Entorno, entrar, levantarEntorno, llamar } from '../ayudantes';

/**
 * EQ-02 · Disponibilidad: si falla un servicio externo, la API responde de forma controlada
 * y no se pierde ni se corrompe ninguna reserva.
 * (La parte de "dos instancias detrás de un balanceador" se prueba con k6 en pruebas-calidad/.)
 */
describe('EQ-02 · Disponibilidad ante fallas de servicios externos', () => {
  let e: Entorno;
  let token: string;
  beforeAll(async () => {
    e = await levantarEntorno();
    token = await entrar(e.url, DATOS_MARIA);
  });
  afterAll(() => e.cerrar());

  const cupoLibre = async () => (await llamar(e.url, 'GET', '/api/v1/citas/cupos?especialidadId=mg&establecimientoId=hra&fecha=2026-11-06', undefined, token)).cuerpo[0].id;

  test('RENIEC caído: 503 con mensaje comprensible, sin 500, y el cupo sigue libre (RN-14)', async () => {
    e.pide.caida = true;
    const cupoId = await cupoLibre();
    const r = await llamar(e.url, 'POST', '/api/v1/citas', { cupoId }, token);
    e.pide.caida = false;
    expect(r.estado).toBe(503);
    expect(r.cuerpo.error.codigo).toBe('SERVICIO_IDENTIDAD_NO_DISPONIBLE');
    expect(await cupoLibre()).toBe(cupoId);
  });

  test('SMS caído: la cita se reserva igual y la notificación queda PENDIENTE (RN-13)', async () => {
    e.sms.caido = true;
    const r = await llamar(e.url, 'POST', '/api/v1/citas', { cupoId: await cupoLibre() }, token);
    e.sms.caido = false;
    expect(r.estado).toBe(201);
    expect(r.cuerpo.notificacion).toBe('PENDIENTE');
  });

  test('Redis caído: la consulta de cupos y la reserva siguen funcionando desde la base de datos', async () => {
    const rota: Cache = {
      tipo: 'redis',
      obtener: async () => { throw new Error('ECONNREFUSED'); },
      guardar: async () => { throw new Error('ECONNREFUSED'); },
      borrar: async () => { throw new Error('ECONNREFUSED'); },
      estadisticas: () => ({ tipo: 'redis', aciertos: 0, fallos: 0, errores: 1, invalidaciones: 0, tasaAciertos: 0 }),
    };
    const cupos = e.infra.cupos as CuposConCacheRepository;
    const citas = e.infra.citas as CitasConInvalidacionRepository;
    const originales = [(cupos as any).cache, (citas as any).cache];
    (cupos as any).cache = rota;
    (citas as any).cache = rota;
    try {
      const consulta = await llamar(e.url, 'GET', '/api/v1/citas/cupos?especialidadId=ped&establecimientoId=hah&fecha=2026-11-06', undefined, token);
      expect(consulta.estado).toBe(200);
      expect(consulta.cuerpo.length).toBeGreaterThan(0);
      const reserva = await llamar(e.url, 'POST', '/api/v1/citas', { cupoId: consulta.cuerpo[0].id }, token);
      expect(reserva.estado).toBe(201);
    } finally {
      [(cupos as any).cache, (citas as any).cache] = originales;
    }
  });

  test('una ruta inexistente o un JSON roto nunca tumban la API (responde 4xx y sigue viva)', async () => {
    expect((await fetch(`${e.url}/api/v1/no-existe`)).status).toBe(404);
    expect((await fetch(`${e.url}/api/v1/identidad/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
    expect((await fetch(`${e.url}/salud`)).status).toBe(200);
  });
});
