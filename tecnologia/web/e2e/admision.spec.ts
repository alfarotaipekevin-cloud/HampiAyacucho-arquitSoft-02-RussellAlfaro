import { expect, test } from '@playwright/test';

/**
 * Spec 007 · Admisión con QR, recorrida por la recepcionista:
 * portal → Admisión → elegir el servicio de su piso → leer el código de la ficha → registrar llegada → marcar atendida.
 * La parte de "registrar llegada" solo es posible con una cita de HOY (RA-02); si a la hora de la prueba
 * ya no quedan cupos hoy, se comprueba igual que una cita de otro día se rechaza con el motivo correcto.
 */

const API = process.env.API_URL ?? 'http://localhost:3000';
const MARIA = { dni: '70000001', fechaNacimiento: '1990-04-15', celular: '987654321', contrasena: 'Hampi2026' };
const PERSONAL = { dni: '70000099', contrasena: 'Hampi2026' };

async function tokenDe(request: any, dni: string, contrasena: string): Promise<string> {
  const r = await request.post(`${API}/api/v1/identidad/sesion`, { data: { numeroDocumento: dni, contrasena } });
  return (await r.json()).token;
}

/** Reserva por la API el primer cupo libre de la fecha indicada (índice en el calendario) y devuelve la cita. */
async function reservar(request: any, token: string, especialidadId: string, indiceFecha: number, soloHoy = false) {
  const h = { Authorization: `Bearer ${token}` };
  const consulta = `especialidadId=${especialidadId}&establecimientoId=hra`;
  const fechas: string[] = await (await request.get(`${API}/api/v1/citas/cupos/fechas?${consulta}`, { headers: h })).json();
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const fecha = soloHoy ? (fechas[0] === hoy ? hoy : null) : fechas[indiceFecha];
  if (!fecha) return null;
  const cupos = await (await request.get(`${API}/api/v1/citas/cupos?${consulta}&fecha=${fecha}`, { headers: h })).json();
  if (!cupos.length) return null;
  const r = await request.post(`${API}/api/v1/citas`, { headers: h, data: { cupoId: cupos[0].id } });
  return r.ok() ? r.json() : null;
}

async function liberar(request: any, token: string) {
  const h = { Authorization: `Bearer ${token}` };
  for (const c of await (await request.get(`${API}/api/v1/citas/mias?estado=RESERVADA`, { headers: h })).json()) {
    await request.patch(`${API}/api/v1/citas/${c.citaId}/cancelar`, { headers: h });
  }
}

test.describe('Recepción (personal de salud)', () => {
  test('elige el servicio, lee el código de una ficha y ve si puede registrar la llegada (spec 007)', async ({ page, request }) => {
    await request.post(`${API}/api/v1/identidad/registro`, { data: { ...MARIA, aceptaTratamientoDatos: true } });
    const maria = await tokenDe(request, MARIA.dni, MARIA.contrasena);
    await liberar(request, maria);
    const otroDia = await reservar(request, maria, 'ped', 1);
    const deHoy = await reservar(request, maria, 'mg', 0, true);
    expect(otroDia).toBeTruthy();

    try {
      await page.goto('/ingresar');
      await page.getByLabel('Número de documento').fill(PERSONAL.dni);
      await page.getByLabel('Contraseña', { exact: true }).fill(PERSONAL.contrasena);
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await expect(page.getByRole('heading', { name: 'Admisión de citas' })).toBeVisible();
      await page.getByRole('link', { name: 'Entrar' }).click();

      await expect(page.getByRole('heading', { name: '¿Qué servicio atiendes hoy?' })).toBeVisible();
      await page.getByRole('button', { name: 'Pediatría' }).click();
      await expect(page.getByRole('heading', { name: 'Citas de hoy' })).toBeVisible();

      // Cita de otro día: se muestran los datos para comparar el DNI, pero no se puede admitir (RA-02).
      await page.getByLabel('Código de la cita').fill(otroDia.codigo.toLowerCase());
      await page.getByLabel('Código de la cita').press('Enter'); // así "escribe" una pistola lectora USB
      const resultado = page.locator('.resultado-qr');
      await expect(resultado).toContainText('María Elena Quispe Huamán');
      await expect(resultado).toContainText('70000001');
      await expect(resultado).toContainText('RA-02');
      await expect(resultado.getByRole('button', { name: 'Registrar llegada' })).toHaveCount(0);

      // RA-06: en la tira de días se ve esa cita como "Programada", solo para consultar.
      const fechaOtroDia = otroDia.fechaHora.slice(0, 10);
      const chips = page.locator('.chip-dia');
      await expect(chips.first()).toBeVisible();
      const fechas = await page.evaluate(async ([api, token]) => {
        const r = await fetch(`${api}/api/v1/citas/admision/dias?especialidadId=ped`, { headers: { Authorization: `Bearer ${token}` } });
        return (await r.json()).map((d: any) => d.fecha);
      }, [API, await tokenDe(request, PERSONAL.dni, PERSONAL.contrasena)]);
      const indice = fechas.indexOf(fechaOtroDia);
      if (indice > 0) {
        await chips.nth(indice).click();
        await expect(page.getByText('Solo consulta.')).toBeVisible();
        const fila = page.locator('.fila-agenda', { hasText: otroDia.codigo });
        await expect(fila).toContainText('Programada');
        await expect(fila.getByRole('button')).toHaveCount(0);
        await chips.first().click();
        await expect(page.getByRole('heading', { name: 'Citas de hoy' })).toBeVisible();
      }

      if (deHoy) {
        await page.getByRole('button', { name: 'Cambiar servicio' }).click();
        await page.getByRole('button', { name: 'Medicina general' }).click();
        await page.getByLabel('Código de la cita').fill(deHoy.codigo);
        await page.getByRole('button', { name: 'Buscar' }).click();
        await resultado.getByRole('button', { name: 'Registrar llegada' }).click();
        await expect(page.getByText('Llegada registrada')).toBeVisible();
        await expect(page.locator('.fila-agenda', { hasText: deHoy.codigo })).toContainText('En espera');
        await resultado.getByRole('button', { name: 'Marcar atendida' }).click();
        await expect(page.locator('.fila-agenda', { hasText: deHoy.codigo })).toContainText('Atendida');
      }
    } finally {
      await liberar(request, maria);
    }
  });

  test('un paciente que entra a /admision vuelve al portal', async ({ page, request }) => {
    await request.post(`${API}/api/v1/identidad/registro`, { data: { ...MARIA, aceptaTratamientoDatos: true } });
    await page.goto('/ingresar');
    await page.getByLabel('Número de documento').fill(MARIA.dni);
    await page.getByLabel('Contraseña', { exact: true }).fill(MARIA.contrasena);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué quieres hacer hoy?' })).toBeVisible();
    await page.goto('/admision');
    await expect(page).toHaveURL(/\/portal/);
  });
});
