import { defineConfig, devices } from '@playwright/test';

/**
 * Prueba de punta a punta: navegador real contra la web y la API.
 * Antes de ejecutarla hay que tener en marcha la API (puerto 3000) y la web (4200),
 * o dejar que `webServer` levante la web. Ver `tecnologia/web/README.md`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:4200',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.WEB_URL
    ? undefined
    : {
        command: 'npm start -- --port 4200',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
