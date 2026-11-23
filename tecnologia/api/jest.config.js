/**
 * Jest · pruebas automatizadas de la API (Sprint 2, actividad 7).
 *   npm test               → unitarias (dominio) + API (HTTP en memoria) + calidad (EQ-02, EQ-04, EQ-06)
 *   npm run test:cobertura → lo mismo + reporte de cobertura en coverage/
 *   npm run test:integracion → API + PostgreSQL + simuladores (docker compose)
 */
const base = { preset: 'ts-jest', testEnvironment: 'node' };

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    { ...base, displayName: 'unitarias', testMatch: ['<rootDir>/src/pruebas/unitarias/**/*.test.ts'] },
    { ...base, displayName: 'api', testMatch: ['<rootDir>/src/pruebas/api/**/*.test.ts'] },
    { ...base, displayName: 'calidad', testMatch: ['<rootDir>/src/pruebas/calidad/**/*.test.ts'] },
    { ...base, displayName: 'integracion', testMatch: ['<rootDir>/src/pruebas/integracion/**/*.test.ts'] },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/pruebas/**',
    '!src/server.ts',
    '!src/db/**',
    '!src/**/postgres*.ts',
    '!src/**/*-postgres.repository.ts',
    '!src/shared/infraestructura/cache-redis.ts', // se prueba en integracion/redis.test.ts
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  coverageThreshold: { global: { lines: 70, branches: 60, functions: 70, statements: 70 } },
};
