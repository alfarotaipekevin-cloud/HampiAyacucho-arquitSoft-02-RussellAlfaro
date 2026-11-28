# 02. Pruebas automatizadas con Jest y CI/CD

> **Sprint 2 del curso · Actividad 7.** Entregable: *pruebas automatizadas con Jest y reporte de cobertura*.

## 1. Suites

Todas las pruebas usan **Jest 29 + ts-jest**. Antes usaban el runner propio de Node (`node:test`) y se migraron en este sprint, sin cambiar lo que comprueban.

| Paquete | Proyecto Jest | Qué prueba | Pruebas | Comando |
| :--- | :--- | :--- | ---: | :--- |
| `tecnologia/api` | `unitarias` | Entidades y reglas de negocio (RN-01…RN-15) sin HTTP ni BD; caché (cache-aside, invalidación, fallas) | 27 | `npm test` |
| `tecnologia/api` | `api` | Endpoints REST en memoria con la PIDE y el SMS falsos: un caso por criterio de aceptación de las specs 002–008 (reserva, admisión con QR, reprogramar); contrato OpenAPI | 71 | `npm test` |
| `tecnologia/api` | `calidad` | Escenarios EQ-02, EQ-04 y EQ-06 | 13 | `npm run test:calidad` |
| `tecnologia/api` | `integracion` | API + PostgreSQL + Redis + simuladores reales (concurrencia RN-11, RN-02, invalidación en Redis) | 9 | `npm run test:integracion` |
| `simuladores/mock-pide-reniec` | — | Contrato del simulador de RENIEC | 8 | `npm test` |
| `simuladores/mock-sms` | — | Contrato del simulador de SMS | 6 | `npm test` |
| `boilerplate-clean-arquitecture` | — | Ejemplo del Sprint 1 | 8 | `npm test` |
| `tecnologia/web` | Playwright | Punta a punta y accesibilidad con axe (11 pantallas) | 14 | `npx playwright test` |
| **Total** | | | **156** | |

## 2. Reporte de cobertura (API)

`npm run test:cobertura` → `tecnologia/api/coverage/index.html` (en el CI se publica como artefacto **cobertura-api**). Medición del 28/11/2026 con 111 pruebas (unitarias + api + calidad). [Captura del reporte](img/cobertura-jest.png).

| Métrica | Cobertura | Umbral mínimo (falla el CI si baja) |
| :--- | ---: | ---: |
| Líneas | **94.6 %** | 70 % |
| Sentencias | **93.7 %** | 70 % |
| Funciones | **90.9 %** | 70 % |
| Ramas | **79.0 %** | 60 % |

| Carpeta | Sentencias | Ramas | Líneas |
| :--- | ---: | ---: | ---: |
| `modules/citas/dominio` | 98.2 % | 93.0 % | 98.2 % |
| `modules/citas/aplicacion` | 97.7 % | 78.6 % | 98.6 % |
| `modules/citas/infraestructura` | 98.0 % | 86.5 % | 97.6 % |
| `modules/citas/presentacion` | 100 % | 100 % | 100 % |
| `modules/identidad/dominio` | 98.2 % | 94.4 % | 98.0 % |
| `modules/identidad/aplicacion` | 97.2 % | 83.9 % | 99.0 % |
| `modules/identidad/infraestructura` | 81.6 % | 57.1 % | 84.8 % |
| `modules/identidad/presentacion` | 100 % | 75.0 % | 100 % |
| `modules/portal/*` | 100 % | 100 % | 100 % |
| `shared/dominio` | 97.6 % | 100 % | 100 % |
| `shared/http` | 90.0 % | 83.3 % | 91.7 % |
| `shared/infraestructura` (clientes HTTP de PIDE y SMS) | 58.0 % | 26.7 % | 62.2 % |

**Fuera del cálculo, a propósito:** los repositorios PostgreSQL, el adaptador Redis, las migraciones y `server.ts`. Necesitan servicios reales y se prueban en el proyecto `integracion`. Los clientes HTTP de PIDE y SMS tienen la cobertura más baja porque en las pruebas unitarias se reemplazan por dobles; su camino feliz se prueba en integración contra los simuladores.

## 3. Reglas de negocio cubiertas

| Regla | Prueba |
| :--- | :--- |
| RN-01, RN-02, RN-09, RN-10 | `unitarias/dominio.test.ts` → *se validan antes de ocupar el cupo* |
| RN-03, RN-04, RN-15 | `unitarias/dominio.test.ts` → cancelar y atender |
| RN-05, RN-06, RN-07, RN-08 | `api/citas.test.ts` → CA-004-2 … CA-004-6 |
| RN-11 (concurrencia) | `api/citas.test.ts` CA-005-5 · `integracion/postgres.test.ts` (10 reservas simultáneas) |
| RN-12, RN-13, RN-14 | `api/citas.test.ts` CA-005-7, CA-005-8, CA-005-11 |
| RI-04 … RI-12 (identidad) | `api/identidad.test.ts` CA-002-1 … CA-002-13 |
| RC-01 … RC-07 (caché y contrato) | `unitarias/cache.test.ts`, `api/openapi.test.ts` |

## 4. Integración continua (GitHub Actions)

`.github/workflows/ci.yml` se ejecuta en **cada push a `main` y en cada pull request**:

```text
pruebas (matriz de 4 paquetes) ─┐
   API: npm run test:cobertura  │
   (sube el reporte de cobertura)├─► docker-compose: levanta PostgreSQL, Redis, simuladores, API y web
web: ng build ──────────────────┘     ├─ verifica /salud (con caché "redis")
                                      ├─ npm run test:integracion (Jest)
                                      └─ Playwright: punta a punta + accesibilidad
```

Si una prueba falla o la cobertura baja del umbral, el PR queda en rojo y no se debe fusionar (Definición de Terminado).
