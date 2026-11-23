import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { crearApp, ConfiguracionPide } from '../app';

// Criterios de aceptación CA-001-1 a CA-001-5 (spec 001)

const base: ConfiguracionPide = { usuario: '40000000', password: 'clave-entidad', latenciaMs: 0, falla: false };
const credenciales = { nuDniUsuario: base.usuario, password: base.password };

const levantar = (config: ConfiguracionPide) =>
  new Promise<{ servidor: Server; url: string }>((resolver) => {
    const servidor = crearApp(config).listen(0, () => {
      resolver({ servidor, url: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}` });
    });
  });

let servidor: Server;
let url: string;

beforeAll(async () => ({ servidor, url } = await levantar(base)));
afterAll(() => servidor.close());

const consultar = async (cuerpo: object, destino = url) => {
  const r = await fetch(`${destino}/reniec/consulta-dni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  return { http: r.status, cuerpo: await r.json() };
};

test('CA-001-1: un DNI registrado devuelve 0000 y los datos de la persona', async () => {
  const r = await consultar({ nuDniConsulta: '70000001', ...credenciales });
  expect(r.http).toBe(200);
  expect(r.cuerpo.coResultado).toBe('0000');
  expect(r.cuerpo.datosPersona.prenombres).toBe('MARÍA ELENA');
  expect(r.cuerpo.datosPersona.apPrimer).toBe('QUISPE');
  expect(r.cuerpo.datosPersona.feNacimiento).toBe('1990-04-15');
});

test('CA-001-2: un DNI que no está registrado devuelve 0001', async () => {
  const r = await consultar({ nuDniConsulta: '12345678', ...credenciales });
  expect(r.http).toBe(200);
  expect(r.cuerpo.coResultado).toBe('0001');
  expect(r.cuerpo.datosPersona).toBe(null);
});

test('CA-001-3: un DNI con restricción devuelve 0002 y el motivo', async () => {
  const r = await consultar({ nuDniConsulta: '70000004', ...credenciales });
  expect(r.cuerpo.coResultado).toBe('0002');
  expect(r.cuerpo.datosPersona.restriccion).toBe('FALLECIDO');
});

test('CA-001-4: credenciales incorrectas devuelven 401 con 1000', async () => {
  const r = await consultar({ nuDniConsulta: '70000001', nuDniUsuario: base.usuario, password: 'otra' });
  expect(r.http).toBe(401);
  expect(r.cuerpo.coResultado).toBe('1000');
});

test('CA-001-5: el DNI 79999999 simula el servicio caído (503)', async () => {
  const r = await consultar({ nuDniConsulta: '79999999', ...credenciales });
  expect(r.http).toBe(503);
  expect(r.cuerpo.coResultado).toBe('9999');
});

test('MP-02: un DNI sin 8 dígitos devuelve 400', async () => {
  const r = await consultar({ nuDniConsulta: '123', ...credenciales });
  expect(r.http).toBe(400);
  expect(r.cuerpo.coResultado).toBe('1001');
});

test('MP-04: con MOCK_FALLA activo todo DNI responde 503', async () => {
  const caido = await levantar({ ...base, falla: true });
  try {
    const r = await consultar({ nuDniConsulta: '70000001', ...credenciales }, caido.url);
    expect(r.http).toBe(503);
  } finally {
    caido.servidor.close();
  }
});

test('/salud responde 200', async () => {
  const r = await fetch(`${url}/salud`);
  expect(r.status).toBe(200);
});
