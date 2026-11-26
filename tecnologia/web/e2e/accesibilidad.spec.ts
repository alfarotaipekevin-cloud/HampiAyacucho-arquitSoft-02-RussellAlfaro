import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * EQ-05 · Accesibilidad (Sprint 2, actividad 8): auditoría automática WCAG 2.1 A/AA con axe-core
 * sobre las pantallas del flujo de reserva. Medida: 0 errores críticos.
 * Los resultados se guardan en tecnologia/pruebas-calidad/accesibilidad/resultados/.
 */

const API = process.env.API_URL ?? 'http://localhost:3000';
const JOSE = { dni: '70000002', fechaNacimiento: '1985-11-02', celular: '912345678', contrasena: 'Clave2026' };
const SALIDA = join(__dirname, '..', '..', 'pruebas-calidad', 'accesibilidad', 'resultados');
const resumen: { pantalla: string; criticas: number; graves: number; moderadas: number; leves: number; reglas: string[] }[] = [];

async function auditar(page: any, pantalla: string) {
  // Espera a que terminen las animaciones de entrada (las infinitas del fondo no cuentan):
  // a mitad de un fundido el texto tiene opacidad parcial y axe mediría un contraste falso.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity),
  );
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const cuenta = (impacto: string) => r.violations.filter((v) => v.impact === impacto).length;
  resumen.push({
    pantalla, criticas: cuenta('critical'), graves: cuenta('serious'), moderadas: cuenta('moderate'), leves: cuenta('minor'),
    reglas: r.violations.map((v) => `${v.impact}: ${v.id} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  });
  return r;
}

test.describe('EQ-05 · Accesibilidad WCAG 2.1 AA', () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/api/v1/identidad/registro`, { data: { ...JOSE, aceptaTratamientoDatos: true } });
  });

  test.afterAll(() => {
    mkdirSync(SALIDA, { recursive: true });
    writeFileSync(join(SALIDA, 'axe-resumen.json'), JSON.stringify(resumen, null, 2));
    const filas = resumen.map((r) => `| ${r.pantalla} | ${r.criticas} | ${r.graves} | ${r.moderadas} | ${r.leves} | ${r.reglas.join('<br>') || '—'} |`);
    writeFileSync(join(SALIDA, 'axe-resumen.md'),
      `| Pantalla | Críticas | Graves | Moderadas | Leves | Reglas incumplidas |\n| :--- | ---: | ---: | ---: | ---: | :--- |\n${filas.join('\n')}\n`);
  });

  for (const [pantalla, ruta] of [['Ingresar', '/ingresar'], ['Crear cuenta', '/crear-cuenta'], ['Recuperar contraseña', '/recuperar']]) {
    test(`${pantalla}: sin errores críticos`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      const r = await auditar(page, pantalla);
      expect(r.violations.filter((v) => v.impact === 'critical')).toEqual([]);
    });
  }

  test('Pantallas con sesión (portal, mis citas, reservar): sin errores críticos', async ({ page }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Número de documento').fill(JOSE.dni);
    await page.getByLabel('Contraseña', { exact: true }).fill(JOSE.contrasena);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué quieres hacer hoy?' })).toBeVisible();

    for (const [pantalla, ruta] of [['Portal', '/portal'], ['Mis citas', '/citas'], ['Reservar cita (paso 1)', '/citas/reservar']]) {
      await page.goto(ruta);
      await page.waitForLoadState('networkidle');
      const r = await auditar(page, pantalla);
      expect(r.violations.filter((v) => v.impact === 'critical'), pantalla).toEqual([]);
    }
  });

  test('Admisión (personal de salud, spec 007): sin errores críticos', async ({ page }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Número de documento').fill('70000099');
    await page.getByLabel('Contraseña', { exact: true }).fill('Hampi2026');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué quieres hacer hoy?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Avance por servicio' })).toBeVisible();
    const portal = await auditar(page, 'Portal del personal');
    expect(portal.violations.filter((v) => v.impact === 'critical')).toEqual([]);
    await page.goto('/admision');
    await page.getByRole('button', { name: 'Pediatría' }).click();
    await expect(page.getByRole('heading', { name: 'Citas de hoy' })).toBeVisible();
    const r = await auditar(page, 'Admisión');
    expect(r.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('El formulario de ingreso se completa solo con el teclado', async ({ page }) => {
    await page.goto('/ingresar');
    await page.waitForLoadState('networkidle');
    // Recorre la página con Tab y anota qué control recibe el foco en cada paso.
    const enfocados: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      enfocados.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return '';
        const etiqueta = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() : '';
        return etiqueta || el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName;
      }));
    }
    const recorrido = enfocados.join(' | ');
    expect(recorrido).toMatch(/Número de documento/);
    expect(recorrido).toMatch(/Contraseña/);
    expect(recorrido).toMatch(/Ingresar/);
  });
});
