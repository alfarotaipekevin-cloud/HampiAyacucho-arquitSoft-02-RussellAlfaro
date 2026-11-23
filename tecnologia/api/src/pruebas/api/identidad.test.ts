import jwt from 'jsonwebtoken';
import { DATOS_JOSE, DATOS_MARIA, Entorno, SECRETO_PRUEBAS, entrar, levantarEntorno, llamar } from '../ayudantes';

// Spec 002 · Identidad y acceso al portal

describe('Spec 002 · crear cuenta (HU09)', () => {
  let e: Entorno;
  beforeAll(async () => (e = await levantarEntorno()));
  afterAll(() => e.cerrar());

  test('verificar devuelve el nombre de RENIEC antes del paso 2', async () => {
    const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro/verificar', { dni: '70000001', fechaNacimiento: '1990-04-15' });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.nombreCompleto).toBe('María Elena Quispe Huamán');
  });

  test('CA-002-1: crea la cuenta con rol PACIENTE y la contraseña con hash', async () => {
    const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', DATOS_MARIA);
    expect(r.estado).toBe(201);
    expect(r.cuerpo.rol).toBe('PACIENTE');
    expect(r.cuerpo.nombreCompleto).toBe('María Elena Quispe Huamán');

    const guardado = await e.infra.usuarios.buscarPorDni('70000001');
    expect(guardado).toBeTruthy();
    expect(guardado!.hashContrasena).not.toBe(DATOS_MARIA.contrasena);
    expect(guardado!.hashContrasena).toMatch(/^\$2[aby]\$/);
  });

  test('CA-002-2: con otra fecha de nacimiento responde 409 IDENTIDAD_NO_VALIDA', async () => {
    const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', { ...DATOS_JOSE, fechaNacimiento: '1985-11-03' });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('IDENTIDAD_NO_VALIDA');
    expect(await e.infra.usuarios.buscarPorDni('70000002')).toBe(null);
  });

  test('CA-002-2: un DNI que no existe en RENIEC también es IDENTIDAD_NO_VALIDA', async () => {
    const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', { ...DATOS_JOSE, dni: '12345678' });
    expect(r.cuerpo.error.codigo).toBe('IDENTIDAD_NO_VALIDA');
  });

  test('CA-002-3: un DNI con restricción responde 409 DNI_RESTRINGIDO', async () => {
    const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', { ...DATOS_JOSE, dni: '70000004', fechaNacimiento: '1970-01-30' });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('DNI_RESTRINGIDO');
  });

  test('CA-002-4: un DNI que ya tiene cuenta responde 409 CUENTA_EXISTENTE', async () => {
    const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', DATOS_MARIA);
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('CUENTA_EXISTENTE');
  });

  test('CA-002-5: si RENIEC no responde, 503 SERVICIO_IDENTIDAD_NO_DISPONIBLE', async () => {
    e.pide.caida = true;
    try {
      const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', DATOS_JOSE);
      expect(r.estado).toBe(503);
      expect(r.cuerpo.error.codigo).toBe('SERVICIO_IDENTIDAD_NO_DISPONIBLE');
      expect(r.cuerpo.error.mensaje).toMatch(/RENIEC/);
    } finally {
      e.pide.caida = false;
    }
  });

  test('RI-05, RI-06 y consentimiento: datos inválidos responden 400', async () => {
    const casos = [
      [{ ...DATOS_JOSE, contrasena: 'solotexto' }, 'DATOS_INVALIDOS'],
      [{ ...DATOS_JOSE, contrasena: 'Ab1' }, 'DATOS_INVALIDOS'],
      [{ ...DATOS_JOSE, celular: '812345678' }, 'DATOS_INVALIDOS'],
      [{ ...DATOS_JOSE, dni: '123' }, 'DATOS_INVALIDOS'],
      [{ ...DATOS_JOSE, aceptaTratamientoDatos: false }, 'CONSENTIMIENTO_REQUERIDO'],
    ] as const;
    for (const [datos, codigo] of casos) {
      const r = await llamar(e.url, 'POST', '/api/v1/identidad/registro', datos);
      expect(r.estado).toBe(400);
      expect(r.cuerpo.error.codigo).toBe(codigo);
    }
  });
});

describe('Spec 002 · iniciar sesión (HU10)', () => {
  let e: Entorno;
  beforeAll(async () => {
    e = await levantarEntorno();
    await llamar(e.url, 'POST', '/api/v1/identidad/registro', DATOS_MARIA);
    await llamar(e.url, 'POST', '/api/v1/identidad/registro', DATOS_JOSE);
  });
  afterAll(() => e.cerrar());

  const sesion = (numeroDocumento: string, contrasena: string) =>
    llamar(e.url, 'POST', '/api/v1/identidad/sesion', { numeroDocumento, contrasena });

  test('CA-002-6: con datos correctos recibe un token de 30 minutos con su rol', async () => {
    const r = await sesion('70000001', 'Hampi2026');
    expect(r.estado).toBe(200);
    expect(r.cuerpo.expiraEn).toBe(1800);
    expect(r.cuerpo.usuario.rol).toEqual('PACIENTE');
    expect(r.cuerpo.usuario.nombre).toBe('María Elena');

    const datos = jwt.verify(r.cuerpo.token, SECRETO_PRUEBAS) as jwt.JwtPayload;
    expect(datos.rol).toBe('PACIENTE');
    expect(datos.dni).toBe('70000001');
    expect(datos.exp! - datos.iat!).toBe(1800);

    const yo = await llamar(e.url, 'GET', '/api/v1/identidad/yo', undefined, r.cuerpo.token);
    expect(yo.estado).toBe(200);
    expect(yo.cuerpo.nombreCompleto).toBe('María Elena Quispe Huamán');
  });

  test('CA-002-7: contraseña incorrecta y DNI sin cuenta dan el mismo 401', async () => {
    const malaClave = await sesion('70000001', 'Incorrecta1');
    const sinCuenta = await sesion('70000003', 'Hampi2026');
    expect(malaClave.estado).toBe(401);
    expect(malaClave.cuerpo).toEqual(sinCuenta.cuerpo);
    expect(malaClave.cuerpo.error.mensaje).toBe('Número de documento o contraseña incorrectos');
  });

  test('CA-002-8: al quinto fallo se bloquea 15 minutos (423), aun con la contraseña correcta', async () => {
    for (let i = 1; i <= 4; i++) expect((await sesion('70000002', 'Mala2026')).estado).toBe(401);
    const quinto = await sesion('70000002', 'Mala2026');
    expect(quinto.estado).toBe(423);
    expect(quinto.cuerpo.error.codigo).toBe('CUENTA_BLOQUEADA');
    expect(new Date(quinto.cuerpo.error.desbloqueoEn).getTime()).toBe(e.reloj.ahora().getTime() + 15 * 60_000);

    expect((await sesion('70000002', 'Clave2026')).estado).toBe(423);
    e.reloj.avanzarMinutos(15);
    expect((await sesion('70000002', 'Clave2026')).estado).toBe(200);
  });

  test('un ingreso correcto reinicia el contador de intentos', async () => {
    expect((await sesion('70000001', 'Hampi2026')).estado).toBe(200); // parte de cero
    for (let i = 1; i <= 4; i++) await sesion('70000001', 'Mala2026');
    expect((await sesion('70000001', 'Hampi2026')).estado).toBe(200);
    expect((await sesion('70000001', 'Mala2026')).estado).toBe(401);
  });

  test('CA-002-12: un token vencido o alterado responde 401', async () => {
    const token = (await sesion('70000001', 'Hampi2026')).cuerpo.token;
    const alterado = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    const vencido = jwt.sign({ dni: '70000001', nombre: 'María', rol: 'PACIENTE' }, SECRETO_PRUEBAS, { subject: 'x', expiresIn: -10 });
    const otraFirma = jwt.sign({ dni: '70000001', nombre: 'María', rol: 'PACIENTE' }, 'otro-secreto', { subject: 'x' });

    for (const t of [alterado, vencido, otraFirma, undefined]) {
      const r = await llamar(e.url, 'GET', '/api/v1/identidad/yo', undefined, t);
      expect(r.estado).toBe(401);
      expect(r.cuerpo.error.codigo).toBe('SESION_REQUERIDA');
    }
  });

  // Aún no hay rutas exclusivas del personal de salud; se prueba el caso inverso, que usa el mismo middleware.
  test('CA-002-13: un rol no autorizado recibe 403 (personal de salud en una ruta de pacientes)', async () => {
    const tokenPersonal = await entrar(e.url, { dni: '70000099', contrasena: 'Hampi2026' });
    const r = await llamar(e.url, 'POST', '/api/v1/citas', { cupoId: 'hra-ped-20261105-0800' }, tokenPersonal);
    expect(r.estado).toBe(403);
    expect(r.cuerpo.error.codigo).toBe('ROL_NO_AUTORIZADO');
  });
});

describe('Spec 002 · recuperar la contraseña (HU11)', () => {
  let e: Entorno;
  beforeAll(async () => {
    e = await levantarEntorno();
    await entrar(e.url, DATOS_MARIA);
  });
  afterAll(() => e.cerrar());

  const solicitar = (numeroDocumento: string) => llamar(e.url, 'POST', '/api/v1/identidad/recuperacion', { numeroDocumento });
  const confirmar = (codigo: string, nuevaContrasena = 'NuevaClave2026') =>
    llamar(e.url, 'POST', '/api/v1/identidad/recuperacion/confirmar', { numeroDocumento: DATOS_MARIA.dni, codigo, nuevaContrasena });
  const otroCodigo = (codigo: string) => String((Number(codigo) + 1) % 1_000_000).padStart(6, '0');

  test('CA-002-10: envía un código de 6 dígitos al celular y muestra *****4321', async () => {
    const r = await solicitar(DATOS_MARIA.dni);
    expect(r.estado).toBe(202);
    expect(r.cuerpo.celular).toBe('*****4321');
    expect(e.mensajero.codigos.get(DATOS_MARIA.celular)!).toMatch(/^\d{6}$/);
  });

  test('RI-12: un documento sin cuenta recibe el mismo mensaje, sin celular', async () => {
    const r = await solicitar('70000003');
    expect(r.estado).toBe(202);
    expect(r.cuerpo.celular).toBe(undefined);
    expect(r.cuerpo.mensaje).toBe((await solicitar(DATOS_MARIA.dni)).cuerpo.mensaje);
  });

  test('con el código correcto cambia la contraseña: la nueva entra y la anterior no', async () => {
    await solicitar(DATOS_MARIA.dni);
    const r = await confirmar(e.mensajero.codigos.get(DATOS_MARIA.celular)!);
    expect(r.estado).toBe(204);
    const sesion = (contrasena: string) => llamar(e.url, 'POST', '/api/v1/identidad/sesion', { numeroDocumento: DATOS_MARIA.dni, contrasena });
    expect((await sesion('NuevaClave2026')).estado).toBe(200);
    expect((await sesion(DATOS_MARIA.contrasena)).estado).toBe(401);
    // El código ya se usó
    expect((await confirmar(e.mensajero.codigos.get(DATOS_MARIA.celular)!)).cuerpo.error.codigo).toBe('CODIGO_INVALIDO');
  });

  test('CA-002-11: un código de hace más de 10 minutos responde 410 CODIGO_VENCIDO', async () => {
    await solicitar(DATOS_MARIA.dni);
    e.reloj.avanzarMinutos(11);
    const r = await confirmar(e.mensajero.codigos.get(DATOS_MARIA.celular)!);
    expect(r.estado).toBe(410);
    expect(r.cuerpo.error.codigo).toBe('CODIGO_VENCIDO');
  });

  test('RI-11: al tercer código incorrecto responde 429 y el código deja de servir', async () => {
    await solicitar(DATOS_MARIA.dni);
    const bueno = e.mensajero.codigos.get(DATOS_MARIA.celular)!;
    expect((await confirmar(otroCodigo(bueno))).estado).toBe(400);
    expect((await confirmar(otroCodigo(bueno))).estado).toBe(400);
    const tercero = await confirmar(otroCodigo(bueno));
    expect(tercero.estado).toBe(429);
    expect(tercero.cuerpo.error.codigo).toBe('INTENTOS_AGOTADOS');
    expect((await confirmar(bueno)).cuerpo.error.codigo).toBe('CODIGO_INVALIDO');
  });

  test('una contraseña nueva que no cumple RI-05 responde 400', async () => {
    await solicitar(DATOS_MARIA.dni);
    const r = await confirmar(e.mensajero.codigos.get(DATOS_MARIA.celular)!, 'corta');
    expect(r.estado).toBe(400);
  });
});
