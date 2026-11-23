import { DATOS_JOSE, DATOS_MARIA, Entorno, entrar, levantarEntorno, llamar } from '../ayudantes';

/**
 * Spec 007 · Admisión con QR. Reloj fijo: miércoles 4 de noviembre de 2026, 10:00 en Lima.
 * Personal 70000099 trabaja en el Hospital Regional (hra); 70000096 en el Hospital de Huanta (hah).
 */
describe('Spec 007 · admisión con QR (recepción)', () => {
  let e: Entorno;
  let personal: string;
  let personalHuanta: string;
  let maria: string;
  let jose: string;
  let citaHoy: any;
  let citaManana: any;

  const api = (metodo: string, ruta: string, token: string) => llamar(e.url, metodo, `/api/v1/citas${ruta}`, metodo === 'POST' ? {} : undefined, token);
  const reservar = async (token: string, cupoId: string) => (await llamar(e.url, 'POST', '/api/v1/citas', { cupoId }, token)).cuerpo;

  beforeAll(async () => {
    e = await levantarEntorno();
    personal = await entrar(e.url, { dni: '70000099', contrasena: 'Hampi2026' });
    personalHuanta = await entrar(e.url, { dni: '70000096', contrasena: 'Hampi2026' });
    maria = await entrar(e.url, DATOS_MARIA);
    jose = await entrar(e.url, DATOS_JOSE);
    citaHoy = await reservar(maria, 'hra-ped-20261104-1040');
    citaManana = await reservar(jose, 'hra-ped-20261105-0800');
  });
  afterAll(() => e.cerrar());

  test('CA-007-1: el personal ve su establecimiento y solo los servicios que atiende', async () => {
    const r = await api('GET', '/admision/servicios', personal);
    expect(r.estado).toBe(200);
    expect(r.cuerpo.establecimiento.id).toBe('hra');
    expect(r.cuerpo.especialidades.map((x: any) => x.id)).toEqual(['car', 'gin', 'mg', 'ped']);
  });

  test('CA-007-2: la agenda exige un servicio que el establecimiento atienda', async () => {
    expect((await api('GET', '/admision/agenda', personal)).cuerpo.error.codigo).toBe('ESPECIALIDAD_REQUERIDA');
    expect((await api('GET', '/admision/agenda?especialidadId=odo', personal)).estado).toBe(404);
  });

  test('CA-007-3: la agenda de hoy muestra solo las citas de ese día y servicio, con el paciente', async () => {
    const r = await api('GET', '/admision/agenda?especialidadId=ped', personal);
    expect(r.estado).toBe(200);
    expect(r.cuerpo.fecha).toBe('2026-11-04');
    expect(r.cuerpo.citas).toHaveLength(1); // la de mañana no aparece
    expect(r.cuerpo.citas[0]).toMatchObject({ codigo: citaHoy.codigo, paciente: 'María Elena Quispe Huamán', dni: '70000001', estadoAdmision: 'POR_LLEGAR' });
    expect(r.cuerpo.resumen).toEqual({ porLlegar: 1, enEspera: 0, atendidas: 0, noLlegaron: 0 });
    expect((await api('GET', '/admision/agenda?especialidadId=mg', personal)).cuerpo.citas).toHaveLength(0);
  });

  test('CA-007-4: al leer el QR se ve la cita y si se puede registrar la llegada (acepta minúsculas)', async () => {
    const r = await api('GET', `/admision/codigo/${citaHoy.codigo.toLowerCase()}`, personal);
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toMatchObject({ citaId: citaHoy.citaId, especialidad: 'Pediatría', dni: '70000001', puedeRegistrarLlegada: true, motivo: null });
    expect((await api('GET', '/admision/codigo/no-es-un-codigo', personal)).cuerpo.error.codigo).toBe('CODIGO_INVALIDO');
    expect((await api('GET', '/admision/codigo/HAMPI-00000000', personal)).estado).toBe(404);
  });

  test('CA-007-5 (RA-01): otro establecimiento no ve los datos del paciente ni puede registrar la llegada', async () => {
    const r = await api('GET', `/admision/codigo/${citaHoy.codigo}`, personalHuanta);
    expect(r.cuerpo).toMatchObject({ dni: '********', paciente: '—', puedeRegistrarLlegada: false });
    expect(r.cuerpo.motivo).toMatch(/RA-01/);
    expect((await api('POST', `/admision/${citaHoy.citaId}/llegada`, personalHuanta)).estado).toBe(404);
    expect((await api('GET', '/admision/agenda?especialidadId=ped', personalHuanta)).cuerpo.citas).toHaveLength(0);
  });

  test('CA-007-6 (RA-02): una cita de otro día no se puede admitir', async () => {
    const r = await api('GET', `/admision/codigo/${citaManana.codigo}`, personal);
    expect(r.cuerpo.puedeRegistrarLlegada).toBe(false);
    expect(r.cuerpo.motivo).toMatch(/RA-02/);
    const llegada = await api('POST', `/admision/${citaManana.citaId}/llegada`, personal);
    expect([llegada.estado, llegada.cuerpo.error.codigo]).toEqual([409, 'CITA_DE_OTRO_DIA']);
  });

  test('CA-007-7 (RA-03, RA-05): llegada → en espera → atendida, y el paciente la ve atendida', async () => {
    const sinLlegada = await api('POST', `/admision/${citaHoy.citaId}/atencion`, personal);
    expect([sinLlegada.estado, sinLlegada.cuerpo.error.codigo]).toEqual([409, 'SIN_LLEGADA']);

    const llegada = await api('POST', `/admision/${citaHoy.citaId}/llegada`, personal);
    expect(llegada.estado).toBe(200);
    expect(llegada.cuerpo).toMatchObject({ estadoAdmision: 'EN_ESPERA', llegadaEn: '2026-11-04T10:00:00-05:00' });
    const otraVez = await api('POST', `/admision/${citaHoy.citaId}/llegada`, personal);
    expect(otraVez.cuerpo.error.codigo).toBe('LLEGADA_YA_REGISTRADA');
    expect((await api('GET', '/admision/agenda?especialidadId=ped', personal)).cuerpo.resumen.enEspera).toBe(1);

    const atendida = await api('POST', `/admision/${citaHoy.citaId}/atencion`, personal);
    expect(atendida.cuerpo).toMatchObject({ estado: 'ATENDIDA', estadoAdmision: 'ATENDIDA' });
    const mias = await llamar(e.url, 'GET', '/api/v1/citas/mias', undefined, maria);
    expect(mias.cuerpo.find((c: any) => c.citaId === citaHoy.citaId).estado).toBe('ATENDIDA');
    const lectura = await api('GET', `/admision/codigo/${citaHoy.codigo}`, personal);
    expect(lectura.cuerpo.motivo).toMatch(/RA-03/);
  });

  test('CA-007-8 (RA-04): pasada la tolerancia de 20 minutos, la cita figura como "no llegó" y no se admite', async () => {
    const cita = await reservar(jose, 'hra-ped-20261104-1020');
    e.reloj.avanzarMinutos(41); // 10:41, tolerancia hasta 10:40
    const agenda = await api('GET', '/admision/agenda?especialidadId=ped', personal);
    expect(agenda.cuerpo.citas.find((c: any) => c.citaId === cita.citaId).estadoAdmision).toBe('NO_LLEGO');
    const llegada = await api('POST', `/admision/${cita.citaId}/llegada`, personal);
    expect([llegada.estado, llegada.cuerpo.error.codigo]).toEqual([409, 'FUERA_DE_TOLERANCIA']);
  });

  test('el portal del personal muestra la tarjeta de Admisión y no la de reservar', async () => {
    const r = await llamar(e.url, 'GET', '/api/v1/portal/modulos', undefined, personal);
    expect(r.cuerpo.modulos[0]).toMatchObject({ clave: 'admision', estado: 'ACTIVO', ruta: '/admision' });
    expect(r.cuerpo.modulos.map((m: any) => m.clave)).not.toContain('citas');
  });
});
