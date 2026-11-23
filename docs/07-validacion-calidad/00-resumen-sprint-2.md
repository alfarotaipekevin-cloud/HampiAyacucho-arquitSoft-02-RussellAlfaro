# Sprint 2 · Implementación y validación de la arquitectura de software

> **Curso:** Arquitectura de Software [IS-488] · Ing. Lizbeth Jaico Quispe · Semestre 2026-II
> **Estudiante:** Russell Kevin Alfaro Taipe · **Alcance acordado:** módulo de reserva de citas
> **Criterio fundamental de la guía:** que la implementación respete las decisiones del Sprint 1 y que se pueda demostrar **con pruebas** si cumple los atributos de calidad.

## 1. Actividades de la guía y su evidencia

| # | Actividad | Cómo se cumple | Evidencia en el repositorio |
| :---: | :--- | :--- | :--- |
| 1 | Implementar el estilo arquitectónico | **Monolito modular** (ADR-001): módulos `identidad`, `portal` y `citas` en una sola aplicación; se comunican solo por su `index.ts` | `tecnologia/api/src/modules/` · prueba `calidad/eq06-mantenibilidad.test.ts` |
| 2 | Aplicar el enfoque arquitectónico | **Clean Architecture** (ADR-002): `dominio → aplicacion → infraestructura / presentacion` en cada módulo | Ídem; 0 violaciones de la regla de dependencias |
| 3 | Especificaciones SDD con criterios de aceptación y tareas técnicas | Specs 001–007, cada una con reglas, contrato, criterios Dado/Cuando/Entonces y plan técnico | [`docs/05-desarrollo-sdd/`](../05-desarrollo-sdd/README.md) · specs nuevas: [006](../05-desarrollo-sdd/specs/006-cache-y-validacion/spec.md) y [007](../05-desarrollo-sdd/specs/007-admision-qr/spec.md) (admisión con QR) |
| 4 | Endpoints REST documentados con OpenAPI/Swagger | 21 operaciones REST (`/api/v1/...`, ADR-003; 5 de admisión, spec 007) con contrato OpenAPI 3 y Swagger UI | `/api/docs` · `src/shared/http/openapi.ts` · [captura](img/swagger-ui.png) |
| 5 | Analizar la BD y la estrategia de caché | `EXPLAIN ANALYZE` con 1.7 millones de cupos; **caché Redis cache-aside** (ADR-004) con invalidación | [01-analisis-base-de-datos-y-cache.md](01-analisis-base-de-datos-y-cache.md) |
| 6 | Aplicar SOLID y patrones | Repository, Adapter (PIDE, SMS, PDF, QR), **Decorator** (caché), Factory/raíz de composición, inversión de dependencias con puertos | [Patrones del Sprint 1](../03-diseño-de-software/diseño-interno/patrones-de-diseño.md) · `modules/citas/infraestructura/cache-cupos.ts` |
| 7 | Pruebas con Jest + CI/CD en GitHub Actions | 125 pruebas (Jest + Playwright); cobertura de la API **94.6 % de líneas**; CI en cada PR | [02-pruebas-automatizadas-jest.md](02-pruebas-automatizadas-jest.md) · `.github/workflows/ci.yml` |
| 8 | Pruebas de los escenarios de calidad (k6 hasta 2,000 usuarios, etc.) | EQ-01 a EQ-06 con k6, Jest y axe-core | [03-validacion-atributos-calidad.md](03-validacion-atributos-calidad.md) · `tecnologia/pruebas-calidad/` |

## 2. Entregables

| Entregable de la guía | Dónde |
| :--- | :--- |
| Código fuente organizado según la arquitectura | `tecnologia/api/src/modules/{identidad,portal,citas}/{dominio,aplicacion,infraestructura,presentacion}` |
| Primera versión funcional | `cd tecnologia && docker compose up --build` → web en <http://localhost:4200>, API en <http://localhost:3000> |
| Documentación de la API (OpenAPI/Swagger) | <http://localhost:3000/api/docs> |
| Pruebas automatizadas con Jest y reporte de cobertura | `cd tecnologia/api && npm run test:cobertura` → `coverage/index.html` (y artefacto del CI) |
| Evidencias de validación de los atributos de calidad | [03-validacion-atributos-calidad.md](03-validacion-atributos-calidad.md) y `tecnologia/pruebas-calidad/**/resultados/` |

## 3. ¿La implementación respeta las decisiones del Sprint 1?

| Decisión | ¿Implementada? | Cómo se comprueba |
| :--- | :---: | :--- |
| ADR-001 Monolito modular | ✅ | EQ-06: los módulos solo se usan por su API pública |
| ADR-002 Clean Architecture | ✅ | EQ-06: ningún import de dominio o aplicación apunta a infraestructura |
| ADR-003 API REST versionada | ✅ | Prueba `api/openapi.test.ts`: las 21 operaciones `/api/v1` existen y coinciden con el contrato |
| ADR-004 Caché Redis | ✅ (en este sprint) | EQ-01: con caché p95 924 ms; sin caché 3,474 ms |
| ADR-005 JWT + RBAC (+ 2FA y auditoría) | ✅ JWT y RBAC · ⏳ 2FA y auditoría | EQ-04: 118/118 accesos no autorizados rechazados. 2FA y bitácora son de la HCE, fuera del alcance |
| ADR-006 Puertos y adaptadores para servicios externos | ✅ | EQ-02: la caída de RENIEC o del SMS se maneja sin errores 500 |
| ADR-007 Réplica de lectura y varias instancias | ✅ varias instancias · ⏳ réplica | EQ-02: 2 instancias + balanceador, 0 errores al apagar una; la réplica no hace falta gracias a la caché (análisis de la BD §7) |
| ADR-008 Simuladores y Docker Compose | ✅ | La PIDE/RENIEC y el SMS son simuladores propios; todo el CI corre con Docker Compose |
| ADR-009 Nube gratuita | ⏳ | Configuración lista (`render.yaml`, `vercel.json`); falta crear las cuentas |

**Brecha encontrada y corregida:** al comparar el código con los ADR, la caché de ADR-004 estaba documentada pero no implementada. Se implementó en este sprint (spec 006) y la prueba de carga demuestra por qué era necesaria.

## 4. Cómo revisar todo en 5 minutos

```bash
cd tecnologia && cp .env.example .env && docker compose up -d --build --wait
open http://localhost:3000/api/docs                       # Swagger
cd api && npm ci && npm run test:cobertura                # Jest + cobertura
k6 run -e VU_MAX=200 -e ESCALA=0.3 ../pruebas-calidad/k6/eq01-disponibilidad.js   # prueba de carga corta
```
