# Sprint 4 · Implementación y validación de la arquitectura (Sprint 2 del curso)

> **Objetivo del sprint:** demostrar, con código y pruebas, que la implementación respeta las decisiones del Sprint 1 del curso y cumple sus atributos de calidad.
> **Fecha de inicio:** 2026-11-22 · **Historias:** HT05, HT06, HT07 · 16 puntos · **Spec:** [006](../../05-desarrollo-sdd/specs/006-cache-y-validacion/spec.md)
> **Guía del curso:** "Sprint 2: Implementación y validación de la arquitectura de software" (Ing. Lizbeth Jaico Quispe).

## Actividades de la guía y cómo se cubren

| # | Actividad de la guía | Estado al iniciar | Trabajo de este sprint | Evidencia |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Implementar el estilo arquitectónico | Monolito modular (ADR-001) ya implementado | Prueba automática del aislamiento entre módulos | `api/src/pruebas/calidad/eq06-mantenibilidad.test.ts` |
| 2 | Aplicar el enfoque (Clean Architecture) | Cuatro capas por módulo (ADR-002) | Prueba automática de la regla de dependencias | Ídem |
| 3 | Especificaciones SDD con criterios y tareas | Specs 001–005 | Spec 006 con CA-006-1…10 y tareas T1…T11 | `docs/05-desarrollo-sdd/specs/006-*` |
| 4 | Endpoints REST con OpenAPI/Swagger | 16 endpoints sin documentar | Contrato OpenAPI 3 + Swagger UI en `/api/docs` + prueba de sincronía | `api/src/shared/http/openapi.ts` |
| 5 | Comportamiento de la BD y estrategia de caché | Índices sí; **caché de ADR-004 sin implementar** | Caché Redis (cache-aside + Decorator) y análisis con `EXPLAIN ANALYZE` sobre 1.7 M de cupos | `docs/07-validacion-calidad/01-*` |
| 6 | SOLID y patrones de diseño | Repository, Adapter, Factory | Decorator para la caché; DIP con el puerto `Cache` | `modules/citas/infraestructura/cache-cupos.ts` |
| 7 | Pruebas con Jest + CI/CD | Pruebas con `node:test` | Migración a Jest en los 4 paquetes, cobertura y reporte en GitHub Actions | `docs/07-validacion-calidad/02-*` |
| 8 | Pruebas de atributos de calidad (k6 hasta 2,000 VU) | Escenarios definidos, sin ejecutar | k6, Jest y axe-core por cada escenario | `docs/07-validacion-calidad/03-*` |

## Sprint backlog

| # | Historia | Tarea (spec 006) | Entregable | Estado |
| :---: | :--- | :--- | :--- | :---: |
| 1 | HT07 | T6 · Migrar las pruebas a Jest con cobertura | `jest.config.js`, `npm run test:cobertura` | Hecho |
| 2 | HT06 | T5 · Contrato OpenAPI y Swagger UI | `/api/docs` | Hecho |
| 3 | HT05 | T1–T3 · Puerto `Cache`, Redis, memoria y decoradores | `cache-cupos.ts`, `cache-redis.ts` | Hecho |
| 4 | HT05 | T4 · Redis en Docker Compose y CI | `docker-compose.yml`, `ci.yml` | Hecho |
| 5 | HT07 | T10 · Análisis de la base de datos | `pruebas-calidad/bd/` | Hecho |
| 6 | HT07 | T7 · Pruebas de calidad en Jest (EQ-02, EQ-04, EQ-06) | `src/pruebas/calidad/` | Hecho |
| 7 | HT07 | T8 · k6: EQ-01 con y sin caché, EQ-02 con dos instancias | `pruebas-calidad/k6/` | Hecho |
| 8 | HT07 | T9 · Auditoría de accesibilidad (EQ-05) | `web/e2e/accesibilidad.spec.ts` | Hecho |
| 9 | HT07 | T11 · Informe de evidencias | `docs/07-validacion-calidad/` | Hecho |

## Sprint Review

| Pregunta | Respuesta |
| :--- | :--- |
| ¿Qué se terminó? | Las 8 actividades de la guía. Ver el [resumen de evidencias](../../07-validacion-calidad/00-resumen-sprint-2.md). |
| ¿Qué no se terminó y por qué? | Traducción al quechua (EQ-05) y bitácora de auditoría (EQ-04), que dependen de módulos fuera del alcance (HCE). EQ-03 a 15,000 usuarios no se puede generar con recursos gratuitos. |
| Demo | `docker compose up --build` → <http://localhost:3000/api/docs> (Swagger) · `npm run test:cobertura` · `k6 run pruebas-calidad/k6/eq01-disponibilidad.js` |

## Retrospectiva

| ¿Qué salió bien? | ¿Qué mejorar? | Acción para el próximo sprint |
| :--- | :--- | :--- |
| Revisar el código contra los ADR encontró la brecha de la caché antes de la evaluación. | Las metas de los escenarios (5,000 y 15,000 usuarios) se fijaron sin medir. | Ajustar las metas de EQ-01 y EQ-03 con los datos de este sprint. |
| Las pruebas de calidad quedaron automatizadas en el CI y no solo como capturas. | El despliegue en la nube sigue pendiente (HT04). | Crear las cuentas de Neon, Render y Vercel. |
