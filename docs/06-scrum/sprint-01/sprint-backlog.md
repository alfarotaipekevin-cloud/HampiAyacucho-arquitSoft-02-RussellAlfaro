# Sprint 1 · Base y APIs simuladas

> **Objetivo del sprint:** poder levantar en local, con un solo comando, la base de datos y los simuladores de RENIEC y SMS, con pruebas automáticas en cada PR.
> **Fecha de inicio:** 2026-10-23 · **Historias:** HT01, HT02, HT03 (10 puntos)

## Sprint backlog

| # | Historia | Tarea | Entregable | Estado |
| :---: | :--- | :--- | :--- | :---: |
| 1 | — | Escribir el plan técnico de la spec 001 | [plan.md](../../05-desarrollo-sdd/specs/001-apis-simuladas/plan.md) | Hecho |
| 2 | HT01 | Simulador PIDE/RENIEC con datos ficticios | `tecnologia/simuladores/mock-pide-reniec` | Hecho |
| 3 | HT01 | Pruebas CA-001-1 a CA-001-5 | `src/pruebas/pide.test.ts` (8 pruebas) | Hecho |
| 4 | HT02 | Simulador SMS y bandeja web `/mensajes` | `tecnologia/simuladores/mock-sms` | Hecho |
| 5 | HT02 | Pruebas CA-001-6 y CA-001-7 | `src/pruebas/sms.test.ts` (6 pruebas) | Hecho |
| 6 | HT03 | Dockerfiles y `docker-compose.yml` con PostgreSQL | `tecnologia/docker-compose.yml` | Hecho |
| 7 | HT03 | CI en GitHub Actions (pruebas + Docker Compose) | `.github/workflows/ci.yml` | Hecho |
| 8 | — | Registrar las decisiones ADR-008 y ADR-009 | `07-decisiones-arquitectonicas.md` | Hecho |
| 9 | — | Elegir el proveedor de nube (ADR-009) | Vercel + Render + Neon (2026-10-23) | Hecho |

## Sprint Review

*Completar al cerrar el sprint.*

| Pregunta | Respuesta |
| :--- | :--- |
| ¿Qué se terminó? | |
| ¿Qué no se terminó y por qué? | |
| Demo | `cd tecnologia && docker compose up --build` · consultar un DNI en `:4001` · ver la bandeja en `http://localhost:4002/mensajes` |

## Retrospectiva

| ¿Qué salió bien? | ¿Qué mejorar? | Acción para el próximo sprint |
| :--- | :--- | :--- |
| | | |
