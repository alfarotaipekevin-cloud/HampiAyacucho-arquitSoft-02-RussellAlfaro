import { DATOS_JOSE, DATOS_MARIA, Entorno, entrar, levantarEntorno, llamar } from '../ayudantes';

// Spec 008 · Reprogramar cita. Reloj: miércoles 04/11/2026 a las 10:00 (Lima).
// En la semilla, los cupos de las 08:20, 09:40, 11:00 y 12:20 ya están OCUPADOS.

describe('Spec 008 · reprogramar cita', () => {
  let e: Entorno;
  let maria: string;
  let jose: string;
  // Entorno nuevo por prueba: RN-10 limita a 3 las citas reservadas de cada paciente.
  beforeEach(async () => {
    e = await levantarEntorno();
    maria = await entrar(e.url, DATOS_MARIA);
    jose = await entrar(e.url, DATOS_JOSE);
  });
  afterEach(() => e.cerrar());

  const reservar = async (cupoId: string, token = maria) => {
    const r = await llamar(e.url, 'POST', '/api/v1/citas', { cupoId }, token);
    if (r.estado !== 201) throw new Error(JSON.stringify(r.cuerpo));
    return r.cuerpo;
  };
  const reprogramar = (citaId: string, cupoId: unknown, token = maria) =>
    llamar(e.url, 'PATCH', `/api/v1/citas/${citaId}/reprogramar`, { cupoId }, token);
  const estadoDelCupo = async (id: string) => ((await e.infra.cupos.buscarPorId(id))!.estaDisponible() ? 'DISPONIBLE' : 'OCUPADO');
  const conReloj = async (iso: string, fn: () => Promise<void>) => {
    const antes = e.reloj.actual;
    e.reloj.actual = new Date(iso);
    try { await fn(); } finally { e.reloj.actual = antes; }
  };

  test('CA-008-1: mueve la cita a otro horario, conserva el código, libera el cupo anterior y envía el SMS', async () => {
    const cita = await reservar('hra-mg-20261105-0800');
    expect(cita.reprogramacionesRestantes).toBe(2);
    const avisosAntes = e.sms.avisos.length;

    const r = await reprogramar(cita.citaId, 'hra-mg-20261106-1000');
    expect(r.estado).toBe(200);
    expect(r.cuerpo.codigo).toBe(cita.codigo); // RR-07: mismo QR
    expect(r.cuerpo.citaId).toBe(cita.citaId);
    expect(r.cuerpo.fechaHora).toBe('2026-11-06T10:00:00-05:00');
    expect(r.cuerpo.estado).toBe('RESERVADA');
    expect(r.cuerpo.reprogramacionesRestantes).toBe(1);
    expect(r.cuerpo.notificacion).toBe('ENVIADA');
    expect(await estadoDelCupo('hra-mg-20261105-0800')).toBe('DISPONIBLE');
    expect(await estadoDelCupo('hra-mg-20261106-1000')).toBe('OCUPADO');

    expect(e.sms.avisos).toHaveLength(avisosAntes + 1);
    expect(e.sms.avisos.at(-1)).toMatchObject({ codigo: cita.codigo, reprogramada: true });

    // El cupo liberado vuelve a aparecer en la disponibilidad (la caché se invalidó)
    const libres = await llamar(e.url, 'GET', '/api/v1/citas/cupos?especialidadId=mg&establecimientoId=hra&fecha=2026-11-05', undefined, jose);
    expect(libres.cuerpo.map((c: any) => c.id)).toContain('hra-mg-20261105-0800');
  });

  test('RR-03: como máximo 2 reprogramaciones por cita', async () => {
    const cita = await reservar('hra-ped-20261110-0800');
    expect((await reprogramar(cita.citaId, 'hra-ped-20261110-0840')).estado).toBe(200);
    expect((await reprogramar(cita.citaId, 'hra-ped-20261110-0900')).cuerpo.reprogramacionesRestantes).toBe(0);
    const r = await reprogramar(cita.citaId, 'hra-ped-20261110-1000');
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('LIMITE_REPROGRAMACIONES');
    expect(await estadoDelCupo('hra-ped-20261110-0900')).toBe('OCUPADO');
    expect(await estadoDelCupo('hra-ped-20261110-1000')).toBe('DISPONIBLE');
  });

  test('RR-02: a menos de 2 horas de la cita responde 409 FUERA_DE_PLAZO', async () => {
    const cita = await reservar('hra-gin-20261105-1000');
    await conReloj('2026-11-05T08:30:00-05:00', async () => {
      const r = await reprogramar(cita.citaId, 'hra-gin-20261106-1000');
      expect(r.estado).toBe(409);
      expect(r.cuerpo.error.codigo).toBe('FUERA_DE_PLAZO');
    });
  });

  test('RR-04: el nuevo horario debe ser de la misma especialidad y establecimiento', async () => {
    const cita = await reservar('hra-car-20261111-0800');
    expect((await reprogramar(cita.citaId, 'hah-mg-20261111-0800')).cuerpo.error.codigo).toBe('OTRO_SERVICIO');
    expect((await reprogramar(cita.citaId, 'hra-mg-20261111-0800')).cuerpo.error.codigo).toBe('OTRO_SERVICIO');
  });

  test('RR-05: el nuevo cupo debe estar libre y no ser el mismo; RN-01 no se le quita a otro paciente', async () => {
    const cita = await reservar('hra-car-20261112-0800');
    expect((await reprogramar(cita.citaId, 'hra-car-20261112-0820')).cuerpo.error.codigo).toBe('CUPO_NO_DISPONIBLE'); // ocupado en la semilla
    expect((await reprogramar(cita.citaId, 'hra-car-20261112-0800')).cuerpo.error.codigo).toBe('MISMO_CUPO');
    expect((await reprogramar(cita.citaId, 'no-existe')).estado).toBe(404);
    expect((await reprogramar(cita.citaId, undefined)).estado).toBe(400);
  });

  test('RN-02: no se puede mover a un día en que ya tiene otra cita de esa especialidad; el mismo día sí', async () => {
    const a = await reservar('hah-ped-20261113-0800');
    await reservar('hah-ped-20261114-0800');
    expect((await reprogramar(a.citaId, 'hah-ped-20261114-1000')).cuerpo.error.codigo).toBe('CITA_DUPLICADA');
    // Moverla a otra hora del mismo día no choca consigo misma
    expect((await reprogramar(a.citaId, 'hah-ped-20261113-1000')).estado).toBe(200);
  });

  test('RR-01: una cita cancelada no se reprograma; la de otro paciente responde 404', async () => {
    const cita = await reservar('hah-gin-20261116-0800');
    expect((await reprogramar(cita.citaId, 'hah-gin-20261116-1000', jose)).estado).toBe(404);
    await llamar(e.url, 'PATCH', `/api/v1/citas/${cita.citaId}/cancelar`, undefined, maria);
    expect((await reprogramar(cita.citaId, 'hah-gin-20261116-1000')).cuerpo.error.codigo).toBe('CITA_NO_RESERVADA');
  });

  test('RN-13: si el SMS falla, la cita queda reprogramada con la notificación PENDIENTE', async () => {
    const cita = await reservar('csjb-mg-20261117-0800');
    e.sms.caido = true;
    try {
      const r = await reprogramar(cita.citaId, 'csjb-mg-20261117-1000');
      expect(r.estado).toBe(200);
      expect(r.cuerpo.notificacion).toBe('PENDIENTE');
    } finally {
      e.sms.caido = false;
    }
  });

  test('RR-08: si dos reprogramaciones piden el mismo cupo a la vez, solo una gana y la otra cita queda igual', async () => {
    const a = await reservar('csca-mg-20261118-0800', maria);
    const b = await reservar('csca-mg-20261118-0840', jose);
    const [ra, rb] = await Promise.all([reprogramar(a.citaId, 'csca-mg-20261118-1000', maria), reprogramar(b.citaId, 'csca-mg-20261118-1000', jose)]);
    expect([ra.estado, rb.estado].sort()).toEqual([200, 409]);
    const perdedora = ra.estado === 409 ? { cita: a, cupo: 'csca-mg-20261118-0800', token: maria } : { cita: b, cupo: 'csca-mg-20261118-0840', token: jose };
    const ficha = await llamar(e.url, 'GET', `/api/v1/citas/${perdedora.cita.citaId}`, undefined, perdedora.token);
    expect(ficha.cuerpo.fechaHora.slice(11, 16)).toBe(perdedora.cupo.slice(-4, -2) + ':' + perdedora.cupo.slice(-2));
    expect(await estadoDelCupo(perdedora.cupo)).toBe('OCUPADO');
  });
});
