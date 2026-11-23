import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { crearApp } from '../app';

// Criterios de aceptación CA-001-6 y CA-001-7 y reglas MS-01 a MS-04 (spec 001)

const apiKey = 'clave-prueba';
let servidor: Server;
let url: string;

beforeAll(
  () =>
    new Promise<void>((listo) => {
      servidor = crearApp({ apiKey, falla: false }).listen(0, () => {
        url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
        listo();
      });
    }),
);
afterAll(() => servidor.close());
beforeEach(() => fetch(`${url}/v1/mensajes`, { method: 'DELETE' }));

const enviar = (cuerpo: object, clave = apiKey) =>
  fetch(`${url}/v1/mensajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
    body: JSON.stringify(cuerpo),
  });

const bandeja = async (telefono?: string) =>
  (await fetch(`${url}/v1/mensajes${telefono ? `?telefono=${encodeURIComponent(telefono)}` : ''}`)).json();

test('CA-001-6: un SMS válido se acepta (202) y aparece en la bandeja JSON y HTML', async () => {
  const texto = 'Hampi: tu cita HAMPI-1A2B3C4D es el 05/11 a las 08:20 en Pediatria.';
  const r = await enviar({ telefono: '+51987654321', texto });
  expect(r.status).toBe(202);
  const cuerpo = await r.json();
  expect(cuerpo.id).toMatch(/^sms_/);
  expect(cuerpo.estado).toBe('ENCOLADO');

  const lista = await bandeja('+51987654321');
  expect(lista.length).toBe(1);
  expect(lista[0].texto).toBe(texto);

  const html = await (await fetch(`${url}/mensajes`)).text();
  expect(html.includes('HAMPI-1A2B3C4D')).toBeTruthy();
});

test('CA-001-7: un teléfono con formato inválido devuelve 400 y no se guarda', async () => {
  const r = await enviar({ telefono: '987654321', texto: 'Hola' });
  expect(r.status).toBe(400);
  expect((await bandeja()).length).toBe(0);
});

test('MS-02: un texto de más de 160 caracteres devuelve 400', async () => {
  const r = await enviar({ telefono: '+51987654321', texto: 'x'.repeat(161) });
  expect(r.status).toBe(400);
});

test('MS-03: sin API key válida devuelve 401', async () => {
  const r = await enviar({ telefono: '+51987654321', texto: 'Hola' }, 'otra');
  expect(r.status).toBe(401);
});

test('MS-04: el teléfono +51900000000 simula el proveedor caído (503)', async () => {
  const r = await enviar({ telefono: '+51900000000', texto: 'Hola' });
  expect(r.status).toBe(503);
  expect((await bandeja()).length).toBe(0);
});

test('la bandeja HTML escapa el contenido de los mensajes', async () => {
  await enviar({ telefono: '+51987654321', texto: '<script>alert(1)</script>' });
  const html = await (await fetch(`${url}/mensajes`)).text();
  expect(!html.includes('<script>alert(1)</script>')).toBeTruthy();
  expect(html.includes('&lt;script&gt;')).toBeTruthy();
});
