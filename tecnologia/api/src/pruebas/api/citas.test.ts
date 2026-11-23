import QRCode from 'qrcode';
import { DATOS_JOSE, DATOS_MARIA, Entorno, entrar, levantarEntorno, llamar } from '../ayudantes';

// El reloj de las pruebas marca el miércoles 04/11/2026 a las 10:00 (Lima).
// En la semilla, los cupos de las 08:20, 09:40, 11:00 y 12:20 ya están OCUPADOS.

describe('Spec 004 · consulta de disponibilidad (HU01)', () => {
  let e: Entorno;
  let token: string;
  beforeAll(async () => {
    e = await levantarEntorno();
    token = await entrar(e.url, DATOS_MARIA);
  });
  afterAll(() => e.cerrar());

  const get = (ruta: string, t = token) => llamar(e.url, 'GET', `/api/v1/citas${ruta}`, undefined, t);

  test('CA-004-1: lista las especialidades de la semilla', async () => {
    const r = await get('/especialidades');
    expect(r.estado).toBe(200);
    expect(r.cuerpo.map((x: any) => x.nombre).sort()).toEqual(['Cardiología', 'Ginecología', 'Medicina general', 'Odontología', 'Pediatría']);
  });

  test('CA-004-2: Odontología solo se atiende en San Juan Bautista y Carmen Alto (RN-08)', async () => {
    const r = await get('/establecimientos?especialidadId=odo');
    expect(r.estado).toBe(200);
    expect(r.cuerpo.map((x: any) => x.id).sort()).toEqual(['csca', 'csjb']);
  });

  test('CA-004-3: solo muestra los cupos libres del día, ordenados por hora', async () => {
    const r = await get('/cupos?especialidadId=ped&establecimientoId=hra&fecha=2026-11-05');
    expect(r.estado).toBe(200);
    const horas = r.cuerpo.map((c: any) => c.fechaHora.slice(11, 16));
    expect(horas).toEqual(['08:00', '08:40', '09:00', '09:20', '10:00', '10:20', '10:40', '11:20', '11:40', '12:00', '12:40']);
    expect(r.cuerpo[0].medico).toBe('Dra. Ana Torres');
    expect(r.cuerpo[0].consultorio).toBe('Consultorio 3');
    expect(r.cuerpo[0].fechaHora).toBe('2026-11-05T08:00:00-05:00');
  });

  test('CA-004-4: hoy a las 10:00 no aparecen los cupos de las 08:00 a 10:00 (RN-05)', async () => {
    const r = await get('/cupos?especialidadId=ped&establecimientoId=hra&fecha=2026-11-04');
    const horas = r.cuerpo.map((c: any) => c.fechaHora.slice(11, 16));
    expect(horas.length > 0).toBeTruthy();
    expect(horas.every((h: string) => h > '10:00')).toBeTruthy();
  });

  test('CA-004-5: a más de 30 días la lista está vacía (RN-06)', async () => {
    expect((await get('/cupos?especialidadId=ped&establecimientoId=hra&fecha=2026-12-04')).cuerpo.length > 0).toBeTruthy();
    expect((await get('/cupos?especialidadId=ped&establecimientoId=hra&fecha=2026-12-05')).cuerpo).toEqual([]);
  });

  test('las fechas con cupos libres van de hoy al día 30 y saltan los domingos', async () => {
    const r = await get('/cupos/fechas?especialidadId=ped&establecimientoId=hra');
    expect(r.cuerpo[0]).toBe('2026-11-04');
    expect(r.cuerpo.at(-1)).toBe('2026-12-04');
    expect(!r.cuerpo.includes('2026-11-08')).toBeTruthy(); // domingo
  });

  test('CA-004-6: un cupo reservado deja de aparecer en la siguiente consulta (RN-07)', async () => {
    const antes = await get('/cupos?especialidadId=car&establecimientoId=hra&fecha=2026-11-10');
    expect(antes.cuerpo.some((c: any) => c.id === 'hra-car-20261110-0800')).toBeTruthy();
    expect((await llamar(e.url, 'POST', '/api/v1/citas', { cupoId: 'hra-car-20261110-0800' }, token)).estado).toBe(201);
    const despues = await get('/cupos?especialidadId=car&establecimientoId=hra&fecha=2026-11-10');
    expect(!despues.cuerpo.some((c: any) => c.id === 'hra-car-20261110-0800')).toBeTruthy();
  });

  test('CA-004-7: sin fecha o con fecha inválida responde 400; con ids inexistentes 404', async () => {
    expect((await get('/cupos?especialidadId=ped&establecimientoId=hra')).estado).toBe(400);
    expect((await get('/cupos?especialidadId=ped&establecimientoId=hra&fecha=2026-02-30')).estado).toBe(400);
    expect((await get('/cupos?especialidadId=xyz&establecimientoId=hra&fecha=2026-11-05')).estado).toBe(404);
    expect((await get('/establecimientos')).estado).toBe(400);
  });

  test('sin sesión responde 401; un rol sin acceso al módulo recibe 403', async () => {
    expect((await get('/especialidades', '')).estado).toBe(401);
    const geresa = await entrar(e.url, { dni: '70000098', contrasena: 'Hampi2026' });
    expect((await get('/especialidades', geresa)).estado).toBe(403);
    const personal = await entrar(e.url, { dni: '70000099', contrasena: 'Hampi2026' });
    expect((await get('/especialidades', personal)).estado).toBe(200);
  });
});

describe('Spec 005 · reserva de cita y ficha QR (HU02, HU13)', () => {
  let e: Entorno;
  let maria: string;
  let jose: string;
  let citaDeMaria: any;

  beforeAll(async () => {
    e = await levantarEntorno();
    maria = await entrar(e.url, DATOS_MARIA);
    jose = await entrar(e.url, DATOS_JOSE);
  });
  afterAll(() => e.cerrar());

  const reservar = (cupoId: unknown, token: string) => llamar(e.url, 'POST', '/api/v1/citas', { cupoId }, token);
  const estadoDelCupo = async (id: string) => ((await e.infra.cupos.buscarPorId(id))!.estaDisponible() ? 'DISPONIBLE' : 'OCUPADO');

  test('CA-005-1: reserva un cupo libre, devuelve la ficha con QR y ocupa el cupo', async () => {
    const r = await reservar('hra-ped-20261105-0800', maria);
    expect(r.estado).toBe(201);
    expect(r.cuerpo.codigo).toMatch(/^HAMPI-[0-9A-F]{8}$/);
    expect(r.cuerpo.estado).toBe('RESERVADA');
    expect(r.cuerpo.paciente).toBe('María Elena Quispe Huamán');
    expect(r.cuerpo.especialidad).toBe('Pediatría');
    expect(r.cuerpo.establecimiento).toMatch(/Hospital Regional de Ayacucho/);
    expect(r.cuerpo.fechaHora).toBe('2026-11-05T08:00:00-05:00');
    expect(r.cuerpo.qr).toMatch(/^data:image\/png;base64,/);
    expect(r.cuerpo.notificacion).toBe('ENVIADA');
    expect(await estadoDelCupo('hra-ped-20261105-0800')).toBe('OCUPADO');
    citaDeMaria = r.cuerpo;
  });

  test('CA-005-2: llega un SMS al celular de María con el código de la cita', () => {
    const aviso = e.sms.avisos.find((a) => a.codigo === citaDeMaria.codigo);
    expect(aviso).toBeTruthy();
    expect(aviso!.celular).toBe('987654321');
    expect(aviso!.establecimiento).toBe('H. Regional Ayacucho');
  });

  test('CA-005-3: otra cita de Pediatría el mismo día responde CITA_DUPLICADA y el cupo sigue libre', async () => {
    for (const cupoId of ['hra-ped-20261105-0840', 'hah-ped-20261105-0800']) {
      const r = await reservar(cupoId, maria);
      expect(r.estado).toBe(409);
      expect(r.cuerpo.error.codigo).toBe('CITA_DUPLICADA');
      expect(await estadoDelCupo(cupoId)).toBe('DISPONIBLE');
    }
  });

  test('CA-005-4: un cupo ocupado responde CUPO_NO_DISPONIBLE', async () => {
    const r = await reservar('hra-ped-20261105-0800', jose);
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('CUPO_NO_DISPONIBLE');
  });

  test('CA-005-5: dos reservas simultáneas del mismo cupo: solo una gana (RN-11)', async () => {
    const [a, b] = await Promise.all([reservar('hra-mg-20261106-0800', maria), reservar('hra-mg-20261106-0800', jose)]);
    expect([a.estado, b.estado].sort()).toEqual([201, 409]);
    const citas = [
      ...(await e.infra.citas.delPaciente(await idDe('70000001'))),
      ...(await e.infra.citas.delPaciente(await idDe('70000002'))),
    ];
    expect(citas.filter((c) => c.cupo.id === 'hra-mg-20261106-0800').length).toBe(1);
  });

  test('CA-005-6: con 3 citas reservadas no puede reservar una cuarta (RN-10)', async () => {
    const rosa = await entrar(e.url, { dni: '70000003', fechaNacimiento: '2015-07-20', celular: '955555555', contrasena: 'Rosa2026x', aceptaTratamientoDatos: true } as any);
    for (const cupoId of ['csjb-mg-20261105-0800', 'csjb-odo-20261105-0800', 'csca-mg-20261106-0800']) {
      expect((await reservar(cupoId, rosa)).estado).toBe(201);
    }
    const r = await reservar('csca-odo-20261107-0800', rosa);
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('LIMITE_CITAS');
  });

  test('CA-005-7: si el SMS falla, la cita se guarda con notificación PENDIENTE (RN-13)', async () => {
    e.sms.caido = true;
    try {
      const r = await reservar('hah-gin-20261109-0800', jose);
      expect(r.estado).toBe(201);
      expect(r.cuerpo.notificacion).toBe('PENDIENTE');
      const guardada = await e.infra.citas.buscarPorId(r.cuerpo.citaId);
      expect(guardada?.notificacion).toBe('PENDIENTE');
    } finally {
      e.sms.caido = false;
    }
  });

  test('CA-005-8: si RENIEC no responde, 503 y el cupo sigue libre (RN-14)', async () => {
    e.pide.caida = true;
    try {
      const r = await reservar('hah-mg-20261110-0800', jose);
      expect(r.estado).toBe(503);
      expect(r.cuerpo.error.codigo).toBe('SERVICIO_IDENTIDAD_NO_DISPONIBLE');
      expect(await estadoDelCupo('hah-mg-20261110-0800')).toBe('DISPONIBLE');
    } finally {
      e.pide.caida = false;
    }
  });

  test('RN-09, cupo inexistente y cupoId faltante', async () => {
    const vencido = await reservar('hra-mg-20261104-0800', jose);
    expect(vencido.estado).toBe(409);
    expect(vencido.cuerpo.error.codigo).toBe('CUPO_VENCIDO');
    expect((await reservar('no-existe', jose)).estado).toBe(404);
    expect((await reservar(undefined, jose)).estado).toBe(400);
  });

  test('CA-005-9: Mis citas muestra solo las propias, las próximas primero', async () => {
    const r = await llamar(e.url, 'GET', '/api/v1/citas/mias', undefined, maria);
    expect(r.estado).toBe(200);
    expect(r.cuerpo.length >= 1).toBeTruthy();
    expect(r.cuerpo[0].codigo).toBe(citaDeMaria.codigo);
    const fechas = r.cuerpo.map((c: any) => c.fechaHora);
    expect(fechas).toEqual([...fechas].sort());
    const deJose = await llamar(e.url, 'GET', '/api/v1/citas/mias', undefined, jose);
    expect(!deJose.cuerpo.some((c: any) => c.codigo === citaDeMaria.codigo)).toBeTruthy();
  });

  test('CA-005-10: José no puede ver la cita de María (404); María sí', async () => {
    const ajena = await llamar(e.url, 'GET', `/api/v1/citas/${citaDeMaria.citaId}`, undefined, jose);
    expect(ajena.estado).toBe(404);
    const propia = await llamar(e.url, 'GET', `/api/v1/citas/${citaDeMaria.citaId}`, undefined, maria);
    expect(propia.estado).toBe(200);
    expect(propia.cuerpo.codigo).toBe(citaDeMaria.codigo);
  });

  test('CA-005-11: el QR contiene solo el código de la cita (RN-12)', async () => {
    const esperado = await QRCode.toDataURL(citaDeMaria.codigo, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
    expect(citaDeMaria.qr).toBe(esperado);
  });

  test('RF03: la ficha se descarga en PDF; la de otro paciente responde 404', async () => {
    const r = await fetch(`${e.url}/api/v1/citas/${citaDeMaria.citaId}/ficha.pdf`, { headers: { Authorization: `Bearer ${maria}` } });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/pdf');
    expect(r.headers.get('content-disposition') ?? '').toMatch(new RegExp(`ficha-${citaDeMaria.codigo}\\.pdf`));
    const pdf = Buffer.from(await r.arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const ajena = await fetch(`${e.url}/api/v1/citas/${citaDeMaria.citaId}/ficha.pdf`, { headers: { Authorization: `Bearer ${jose}` } });
    expect(ajena.status).toBe(404);
  });

  test('CA-005-12: María cancela una cita que es en 5 horas; queda CANCELADA y el cupo vuelve a estar libre', async () => {
    const cupoId = 'hra-car-20261105-0800';
    const cita = (await reservar(cupoId, maria)).cuerpo;
    const antes = e.reloj.actual;
    e.reloj.actual = new Date('2026-11-05T03:00:00-05:00');
    try {
      expect((await llamar(e.url, 'PATCH', `/api/v1/citas/${cita.citaId}/cancelar`, undefined, jose)).estado).toBe(404);
      const r = await llamar(e.url, 'PATCH', `/api/v1/citas/${cita.citaId}/cancelar`, undefined, maria);
      expect(r.estado).toBe(200);
      expect(r.cuerpo.estado).toBe('CANCELADA');
      expect(await estadoDelCupo(cupoId)).toBe('DISPONIBLE');
      const otraVez = await llamar(e.url, 'PATCH', `/api/v1/citas/${cita.citaId}/cancelar`, undefined, maria);
      expect(otraVez.cuerpo.error.codigo).toBe('CITA_NO_RESERVADA');
      // El cupo liberado se puede volver a reservar
      expect((await reservar(cupoId, jose)).estado).toBe(201);
    } finally {
      e.reloj.actual = antes;
    }
  });

  test('RN-15: a menos de 2 horas de la cita responde 409 FUERA_DE_PLAZO', async () => {
    const cita = (await reservar('hra-car-20261105-1000', maria)).cuerpo;
    const antes = e.reloj.actual;
    e.reloj.actual = new Date('2026-11-05T08:30:00-05:00');
    try {
      const r = await llamar(e.url, 'PATCH', `/api/v1/citas/${cita.citaId}/cancelar`, undefined, maria);
      expect(r.estado).toBe(409);
      expect(r.cuerpo.error.codigo).toBe('FUERA_DE_PLAZO');
      expect(await estadoDelCupo('hra-car-20261105-1000')).toBe('OCUPADO');
    } finally {
      e.reloj.actual = antes;
    }
  });

  const idDe = async (dni: string) => (await e.infra.usuarios.buscarPorDni(dni))!.id;
});

describe('Spec 003 · portal por módulos (HU12)', () => {
  let e: Entorno;
  beforeAll(async () => (e = await levantarEntorno()));
  afterAll(() => e.cerrar());

  test('CA-003-1: un PACIENTE ve Citas activo primero y Historia clínica como Próximamente', async () => {
    const token = await entrar(e.url, DATOS_MARIA);
    const r = await llamar(e.url, 'GET', '/api/v1/portal/modulos', undefined, token);
    expect(r.estado).toBe(200);
    expect(r.cuerpo.usuario).toEqual({ nombre: 'María Elena', rol: 'PACIENTE' });
    expect(r.cuerpo.modulos.map((m: any) => [m.clave, m.estado])).toEqual([['citas', 'ACTIVO'], ['hce', 'PROXIMAMENTE']]);
    expect(r.cuerpo.modulos[0].ruta).toBe('/citas');
    expect(r.cuerpo.modulos[0].roles).toBe(undefined);
  });

  test('CA-003-2: un ESPECIALISTA_GERESA ve Indicadores y no ve Citas', async () => {
    const token = await entrar(e.url, { dni: '70000098', contrasena: 'Hampi2026' });
    const r = await llamar(e.url, 'GET', '/api/v1/portal/modulos', undefined, token);
    expect(r.cuerpo.modulos.map((m: any) => m.clave)).toEqual(['indicadores']);
  });

  test('CA-003-3: sin sesión responde 401', async () => {
    expect((await llamar(e.url, 'GET', '/api/v1/portal/modulos')).estado).toBe(401);
  });
});
