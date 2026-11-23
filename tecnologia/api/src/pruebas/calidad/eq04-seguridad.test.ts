import jwt from 'jsonwebtoken';
import { documentoOpenApi } from '../../shared/http/openapi';
import { DATOS_MARIA, Entorno, SECRETO_PRUEBAS, entrar, levantarEntorno } from '../ayudantes';

/**
 * EQ-04 · Seguridad (adaptado al alcance del Sprint 2: módulo Citas, sin HCE).
 * Medida: se rechaza el 100 % de los intentos no autorizados (401/403) y ninguna respuesta
 * de error expone datos internos. Matriz: cada operación protegida x cada tipo de credencial.
 */

type Credencial = 'SIN_TOKEN' | 'TOKEN_ALTERADO' | 'TOKEN_VENCIDO' | 'OTRA_FIRMA' | 'ALG_NONE' | 'PACIENTE' | 'PERSONAL_SALUD' | 'ESPECIALISTA_GERESA' | 'ADMINISTRADOR';
const INVALIDAS: Credencial[] = ['SIN_TOKEN', 'TOKEN_ALTERADO', 'TOKEN_VENCIDO', 'OTRA_FIRMA', 'ALG_NONE'];
const ROLES = ['PACIENTE', 'PERSONAL_SALUD', 'ESPECIALISTA_GERESA', 'ADMINISTRADOR'] as const;

/** Quién puede usar cada operación (specs 004, 005 y 007: catálogo para paciente y personal; reserva solo paciente; admisión solo personal). */
function rolesPermitidos(ruta: string): readonly string[] {
  if (ruta === '/identidad/yo' || ruta === '/portal/modulos') return ROLES;
  if (ruta.startsWith('/citas/admision')) return ['PERSONAL_SALUD']; // spec 007
  if (ruta.startsWith('/citas/especialidades') || ruta.startsWith('/citas/establecimientos') || ruta.startsWith('/citas/cupos')) return ['PACIENTE', 'PERSONAL_SALUD'];
  return ['PACIENTE'];
}

const OPERACIONES = Object.entries(documentoOpenApi.paths).flatMap(([ruta, ops]) =>
  Object.entries(ops as Record<string, any>).filter(([, op]) => op.security).map(([metodo]) => ({ metodo: metodo.toUpperCase(), ruta })));

describe('EQ-04 · Seguridad: autenticación JWT y control de acceso por rol (RBAC)', () => {
  let e: Entorno;
  const tokens: Partial<Record<Credencial, string>> = {};
  const resultados: { credencial: Credencial; operacion: string; esperado: string; estado: number }[] = [];

  beforeAll(async () => {
    e = await levantarEntorno();
    tokens.PACIENTE = await entrar(e.url, DATOS_MARIA);
    tokens.PERSONAL_SALUD = await entrar(e.url, { dni: '70000099', contrasena: 'Hampi2026' });
    tokens.ESPECIALISTA_GERESA = await entrar(e.url, { dni: '70000098', contrasena: 'Hampi2026' });
    tokens.ADMINISTRADOR = await entrar(e.url, { dni: '70000097', contrasena: 'Hampi2026' });
    const p = tokens.PACIENTE;
    tokens.TOKEN_ALTERADO = p.slice(0, -2) + (p.endsWith('aa') ? 'bb' : 'aa');
    tokens.TOKEN_VENCIDO = jwt.sign({ dni: '70000001', nombre: 'María', rol: 'PACIENTE' }, SECRETO_PRUEBAS, { subject: 'x', expiresIn: -10 });
    tokens.OTRA_FIRMA = jwt.sign({ dni: '70000001', nombre: 'María', rol: 'ADMINISTRADOR' }, 'secreto-de-un-atacante', { subject: 'x' });
    tokens.ALG_NONE = jwt.sign({ dni: '70000001', nombre: 'María', rol: 'PACIENTE' }, '', { subject: 'x', algorithm: 'none' });
  });
  afterAll(() => e.cerrar());

  const llamar = async (metodo: string, ruta: string, credencial: Credencial) => {
    const token = tokens[credencial];
    const r = await fetch(`${e.url}/api/v1${ruta.replace(/\{\w+\}/g, '00000000-0000-0000-0000-000000000000')}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: metodo === 'GET' ? undefined : JSON.stringify({ cupoId: 'hra-ped-20261105-0800' }),
    });
    return { estado: r.status, cuerpo: await r.text() };
  };

  test('credenciales inválidas: todas las operaciones protegidas responden 401 SESION_REQUERIDA', async () => {
    for (const { metodo, ruta } of OPERACIONES) {
      for (const credencial of INVALIDAS) {
        const r = await llamar(metodo, ruta, credencial);
        resultados.push({ credencial, operacion: `${metodo} ${ruta}`, esperado: '401', estado: r.estado });
        expect(`${credencial} ${metodo} ${ruta} → ${r.estado}`).toBe(`${credencial} ${metodo} ${ruta} → 401`);
        expect(JSON.parse(r.cuerpo).error.codigo).toBe('SESION_REQUERIDA');
      }
    }
  });

  test('roles: cada rol solo entra a las operaciones que le corresponden (403 ROL_NO_AUTORIZADO en el resto)', async () => {
    for (const { metodo, ruta } of OPERACIONES) {
      for (const rol of ROLES) {
        const permitido = rolesPermitidos(ruta).includes(rol);
        const r = await llamar(metodo, ruta, rol);
        resultados.push({ credencial: rol, operacion: `${metodo} ${ruta}`, esperado: permitido ? 'permitido' : '403', estado: r.estado });
        if (permitido) expect(`${rol} ${metodo} ${ruta} → ${[401, 403].includes(r.estado) ? 'rechazado' : 'permitido'}`).toBe(`${rol} ${metodo} ${ruta} → permitido`);
        else expect(`${rol} ${metodo} ${ruta} → ${r.estado}`).toBe(`${rol} ${metodo} ${ruta} → 403`);
      }
    }
  });

  test('ninguna respuesta de error expone trazas, SQL ni el hash de la contraseña', async () => {
    for (const ruta of ['/citas/no-existe', '/identidad/yo']) {
      const r = await llamar('GET', ruta, 'PACIENTE');
      expect(r.cuerpo).not.toMatch(/at \w+ \(|stack|SELECT|hash_?contrasena|\$2[aby]\$/i);
    }
    const mal = await fetch(`${e.url}/api/v1/identidad/sesion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"roto":' });
    expect(mal.status).toBe(400);
    expect(await mal.text()).not.toMatch(/SyntaxError|at JSON/);
  });

  test('la API no anuncia su tecnología (sin cabecera X-Powered-By)', async () => {
    const r = await fetch(`${e.url}/salud`);
    expect(r.headers.get('x-powered-by')).toBeNull();
  });

  afterAll(() => {
    const noAutorizados = resultados.filter((r) => r.esperado !== 'permitido');
    const rechazados = noAutorizados.filter((r) => r.estado === Number(r.esperado));
    console.log(`EQ-04: ${rechazados.length} de ${noAutorizados.length} intentos no autorizados rechazados ` +
      `(${((rechazados.length / noAutorizados.length) * 100).toFixed(1)} %); ${resultados.length - noAutorizados.length} accesos legítimos permitidos.`);
  });
});
