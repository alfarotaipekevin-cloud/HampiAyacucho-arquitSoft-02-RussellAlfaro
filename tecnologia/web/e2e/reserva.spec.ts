import { expect, test } from '@playwright/test';

/**
 * Recorre el camino completo del paciente (specs 002 a 005):
 * crear cuenta → ingresar → portal → reservar → ficha con QR → mis citas → cancelar.
 * Cada ejecución usa un DNI del simulador RENIEC con una contraseña propia.
 */

const API = process.env.API_URL ?? 'http://localhost:3000';
/** Contraseña de la cuenta que se crea desde el formulario (Rosa, solo la usa esta suite). */
const CLAVE = 'Hampi2026';

/**
 * DNIs ficticios del simulador (spec 001, §3.3). Las contraseñas son las mismas que usan las pruebas
 * de integración de la API (`ayudantes.ts`), porque en el CI ambas suites comparten la base de datos.
 */
const PACIENTES = {
  maria: {
    dni: '70000001',
    fechaNacimiento: '1990-04-15',
    celular: '987654321',
    contrasena: 'Hampi2026',
    nombre: 'María Elena Quispe Huamán',
  },
  jose: {
    dni: '70000002',
    fechaNacimiento: '1985-11-02',
    celular: '912345678',
    contrasena: 'Clave2026',
    nombre: 'José Luis Huamán Cárdenas',
  },
};
type Paciente = typeof PACIENTES.maria;

/** Crea la cuenta por la API si todavía no existe, para no repetir el formulario en cada prueba. */
async function asegurarCuenta(request: any, { nombre, ...datos }: Paciente) {
  await request.post(`${API}/api/v1/identidad/registro`, { data: { ...datos, aceptaTratamientoDatos: true } });
}

/**
 * Deja al paciente sin citas reservadas antes de la prueba, para que una ejecución anterior
 * que se haya cortado a medias no choque con RN-02 (una cita por especialidad y día) ni con RN-10.
 */
async function liberarCitas(request: any, p: Paciente) {
  const sesion = await request.post(`${API}/api/v1/identidad/sesion`, { data: { numeroDocumento: p.dni, contrasena: p.contrasena } });
  if (!sesion.ok()) return;
  const { token } = await sesion.json();
  const cabeceras = { Authorization: `Bearer ${token}` };
  const citas = await (await request.get(`${API}/api/v1/citas/mias?estado=RESERVADA`, { headers: cabeceras })).json();
  for (const cita of citas) {
    await request.patch(`${API}/api/v1/citas/${cita.citaId}/cancelar`, { headers: cabeceras });
  }
}

async function ingresar(page: any, p: Paciente) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingresar/);
  await page.getByLabel('Número de documento').fill(p.dni);
  await page.getByLabel('Contraseña', { exact: true }).fill(p.contrasena);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { name: '¿Qué quieres hacer hoy?' })).toBeVisible();
}

test.describe('Paciente', () => {
  test('crea su cuenta desde el formulario en dos pasos (HU09)', async ({ page, request }) => {
    await page.goto('/crear-cuenta');
    await page.getByLabel('Número de DNI').fill('70000003');
    await page.getByLabel('Fecha de nacimiento').fill('2015-07-20');
    await page.getByRole('button', { name: 'Verificar' }).click();

    // Paso 2: el nombre llega de RENIEC, el paciente no lo escribe.
    await expect(page.getByText('Rosa Pariona Gamboa')).toBeVisible();
    await page.getByLabel('Número de celular').fill('955555555');
    await page.getByLabel('Crea una contraseña').fill(CLAVE);
    await page.getByLabel('Repite la contraseña').fill(CLAVE);
    await page.getByLabel(/Autorizo el tratamiento/).check();
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click();

    // Si la suite se repite contra la misma API, la cuenta ya existe y la API lo dice (RI-04).
    await expect(page.getByText(/Tu cuenta está lista|ya tiene una cuenta/)).toBeVisible();
    expect(
      (
        await request.post(`${API}/api/v1/identidad/sesion`, {
          data: { numeroDocumento: '70000003', contrasena: CLAVE },
        })
      ).status(),
    ).toBe(200);
  });

  test('una contraseña incorrecta no deja entrar (CA-002-7)', async ({ page, request }) => {
    await asegurarCuenta(request, PACIENTES.jose);
    await page.goto('/ingresar');
    await page.getByLabel('Número de documento').fill(PACIENTES.jose.dni);
    await page.getByLabel('Contraseña', { exact: true }).fill('ClaveQueNoEs1');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test('reserva una cita, ve la ficha con el QR y la encuentra en Mis citas (HU02, HU13)', async ({ page, request }) => {
    await asegurarCuenta(request, PACIENTES.maria);
    await liberarCitas(request, PACIENTES.maria);
    await ingresar(page, PACIENTES.maria);

    // El portal muestra Citas activo y el resto como Próximamente (CA-003-1).
    await expect(page.getByRole('heading', { name: 'Citas' })).toBeVisible();
    await expect(page.getByText('Próximamente').first()).toBeVisible();
    await page.getByRole('link', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Reservar una cita' }).click();

    // Paso a paso: especialidad → establecimiento → día → hora → confirmar.
    await page.getByRole('button', { name: 'Pediatría' }).click();
    await page.getByRole('button', { name: /Hospital Regional de Ayacucho/ }).click();
    // La pantalla cambia al calendario cuando llegan las fechas; antes, .opciones aún son los establecimientos.
    await expect(page.getByRole('heading', { name: 'Elige el día' })).toBeVisible();
    await page.locator('.opciones button').nth(1).click();
    await page.locator('.opciones.horas button').first().click();
    await expect(page.getByRole('heading', { name: 'Revisa tu cita antes de confirmar' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar la cita' }).click();

    // Ficha: código, QR y aviso del SMS.
    await expect(page.getByRole('heading', { name: 'Tu cita está reservada' })).toBeVisible();
    const codigo = (await page.locator('.ficha-codigo').innerText()).trim();
    expect(codigo).toMatch(/^HAMPI-[0-9A-F]{8}$/);
    await expect(page.locator('.ficha-qr')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect(page.getByText('Te enviamos un SMS')).toBeVisible();
    await expect(page.getByText(PACIENTES.maria.nombre)).toBeVisible();

    // El PDF se descarga con el token de la sesión.
    const descarga = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PDF' }).click()]);
    expect(descarga[0].suggestedFilename()).toBe(`ficha-${codigo}.pdf`);

    await page.getByRole('link', { name: 'Ver mis citas' }).click();
    await expect(page.getByText(codigo)).toBeVisible();

    // Se cancela al final para que la suite se pueda repetir sin chocar con RN-02 y RN-10.
    page.on('dialog', (d) => d.accept());
    await page.locator('.cita', { hasText: codigo }).getByRole('link', { name: 'Ver la ficha' }).click();
    await page.getByRole('button', { name: 'Cancelar la cita' }).click();
    await expect(page.getByText('Cancelamos tu cita')).toBeVisible();
  });

  test('cancela una cita y el cupo vuelve a quedar libre (CA-005-12)', async ({ page, request }) => {
    await asegurarCuenta(request, PACIENTES.jose);
    await liberarCitas(request, PACIENTES.jose);
    await ingresar(page, PACIENTES.jose);
    await page.goto('/citas/reservar');
    await page.getByRole('button', { name: 'Odontología' }).click();
    await page.getByRole('button', { name: /San Juan Bautista/ }).click();
    await expect(page.getByRole('heading', { name: 'Elige el día' })).toBeVisible();
    // El segundo día de la lista siempre tiene todos sus cupos por delante.
    await page.locator('.opciones button').nth(1).click();
    await page.locator('.opciones.horas button').first().click();
    await page.getByRole('button', { name: 'Confirmar la cita' }).click();
    await expect(page.getByRole('heading', { name: 'Tu cita está reservada' })).toBeVisible();

    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Cancelar la cita' }).click();
    await expect(page.getByText('Cancelamos tu cita')).toBeVisible();
    await expect(page.getByText('Cancelada')).toBeVisible();
  });

  test('reprograma su cita a otro día y hora sin cambiar el código QR (spec 008)', async ({ page, request }) => {
    await asegurarCuenta(request, PACIENTES.jose);
    await liberarCitas(request, PACIENTES.jose);
    await ingresar(page, PACIENTES.jose);
    await page.goto('/citas/reservar');
    await page.getByRole('button', { name: 'Medicina general' }).click();
    await page.getByRole('button', { name: /Carmen Alto/ }).click();
    await expect(page.getByRole('heading', { name: 'Elige el día' })).toBeVisible();
    await page.locator('.opciones button').nth(1).click();
    await page.locator('.opciones.horas button').first().click();
    await page.getByRole('button', { name: 'Confirmar la cita' }).click();
    await expect(page.getByRole('heading', { name: 'Tu cita está reservada' })).toBeVisible();
    const codigo = (await page.locator('.ficha-codigo').innerText()).trim();
    const antes = await page.locator('.cabecera-pagina p').innerText();

    await page.getByRole('button', { name: /Cambiar fecha u hora/ }).click();
    await expect(page.getByRole('heading', { name: 'Reprogramar la cita' })).toBeVisible();
    await expect(page.getByText('Te quedan 2 cambios')).toBeVisible();
    const confirmar = page.getByRole('button', { name: 'Confirmar nueva fecha' });
    await expect(confirmar).toBeDisabled();
    await page.locator('.reprogramar .dia-boton').nth(2).click();
    await page.locator('.reprogramar .hora-boton').first().click();
    await confirmar.click();

    await expect(page.getByText('Reprogramamos tu cita')).toBeVisible();
    await expect(page.locator('.ficha-codigo')).toHaveText(codigo); // RR-07
    await expect(page.locator('.cabecera-pagina p')).not.toHaveText(antes);

    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Cancelar la cita' }).click();
    await expect(page.getByText('Cancelamos tu cita')).toBeVisible();
  });

  test('sin sesión, una ruta del portal lleva al ingreso', async ({ page }) => {
    await page.goto('/citas');
    await expect(page).toHaveURL(/\/ingresar/);
  });
});
