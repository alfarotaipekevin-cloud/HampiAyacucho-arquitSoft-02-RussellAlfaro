import { documentoOpenApi } from '../../shared/http/openapi';
import { Entorno, levantarEntorno } from '../ayudantes';

// Actividad 4 del Sprint 2: la documentación OpenAPI debe coincidir con las rutas reales de Express.

describe('Documentación OpenAPI/Swagger', () => {
  let e: Entorno;
  beforeAll(async () => (e = await levantarEntorno()));
  afterAll(() => e.cerrar());

  test('/api/docs/openapi.json publica el contrato OpenAPI 3', async () => {
    const r = await fetch(`${e.url}/api/docs/openapi.json`);
    expect(r.status).toBe(200);
    const doc = await r.json();
    expect(doc.openapi).toMatch(/^3\./);
    expect(Object.keys(doc.paths).length).toBeGreaterThanOrEqual(15);
  });

  test('/api/docs muestra Swagger UI', async () => {
    const r = await fetch(`${e.url}/api/docs/`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('swagger-ui');
  });

  test('cada endpoint documentado existe en la API y responde distinto de 404 RUTA_NO_EXISTE', async () => {
    for (const [ruta, operaciones] of Object.entries(documentoOpenApi.paths)) {
      for (const metodo of Object.keys(operaciones)) {
        const url = `${e.url}/api/v1${ruta.replace(/\{\w+\}/g, '00000000-0000-0000-0000-000000000000')}`;
        const r = await fetch(url, { method: metodo.toUpperCase(), headers: { 'Content-Type': 'application/json' }, body: metodo === 'get' ? undefined : '{}' });
        const cuerpo = await r.text();
        expect(`${metodo.toUpperCase()} ${ruta} → ${cuerpo.includes('RUTA_NO_EXISTE') ? 'NO EXISTE' : 'ok'}`).toBe(`${metodo.toUpperCase()} ${ruta} → ok`);
      }
    }
  });

  test('las rutas protegidas declaran seguridad bearer y responden 401 sin token', async () => {
    for (const [ruta, operaciones] of Object.entries(documentoOpenApi.paths)) {
      for (const [metodo, op] of Object.entries(operaciones as Record<string, any>)) {
        if (!op.security) continue;
        const url = `${e.url}/api/v1${ruta.replace(/\{\w+\}/g, 'x')}`;
        const r = await fetch(url, { method: metodo.toUpperCase() });
        expect(`${metodo} ${ruta}: ${r.status}`).toBe(`${metodo} ${ruta}: 401`);
      }
    }
  });

  test('el contrato cubre las 16 operaciones de las specs 002 a 005', () => {
    const operaciones = Object.entries(documentoOpenApi.paths).flatMap(([ruta, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${ruta}`));
    expect(operaciones).toHaveLength(16);
  });
});
