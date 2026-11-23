# Sprint 2 · Backend

> **Objetivo del sprint:** API de Identidad y Citas funcionando con PostgreSQL y los simuladores, probada de punta a punta y lista para desplegarse.
> **Fecha de inicio:** 2026-10-23 · **Historias:** HU09, HU10, HU01, HU02, HU12 (endpoint) y HT04 (preparación) · 26 puntos

## Sprint backlog

| # | Historia | Tarea | Entregable | Estado |
| :---: | :--- | :--- | :--- | :---: |
| 1 | — | Planes técnicos de las specs 002 a 005 | `specs/00x/plan.md` | Hecho |
| 2 | — | Paquete `tecnologia/api` y núcleo compartido (Dni, errores, fechas en Lima, reloj, clientes PIDE y SMS) | `src/shared/` | Hecho |
| 3 | HU09, HU10 | Módulo Identidad: crear cuenta con RENIEC, iniciar sesión, bloqueo, JWT y roles | `src/modules/identidad/` | Hecho |
| 4 | HU12 | Módulo Portal: catálogo de módulos por rol | `src/modules/portal/` | Hecho |
| 5 | HU01 | Disponibilidad: especialidades, establecimientos, cupos y fechas | `src/modules/citas/` | Hecho |
| 6 | HU02 | Reserva atómica, ficha con QR, SMS y "Mis citas" | `src/modules/citas/` | Hecho |
| 7 | — | PostgreSQL: migración inicial, migrador y semilla idempotente | `src/db/` | Hecho |
| 8 | — | Pruebas: 47 unitarias y de API, 5 de integración con PostgreSQL y simuladores | `src/pruebas/` | Hecho |
| 9 | HT03 | API en Docker Compose y en el CI | `docker-compose.yml`, `ci.yml` | Hecho |
| 10 | HT04 | Blueprint de Render y guía de despliegue | `render.yaml`, `03-guia-de-despliegue.md` | Hecho |
| 11 | HT04 | Crear las cuentas de Neon y Render y desplegar | Acción del Product Owner (necesita sus cuentas) | Pendiente |

**Movido al Sprint 3:** HU11 (recuperar contraseña), descarga de la ficha en PDF, cancelar cita y reintento de SMS pendientes.

## Sprint Review

*Completar al cerrar el sprint.*

| Pregunta | Respuesta |
| :--- | :--- |
| ¿Qué se terminó? | |
| ¿Qué no se terminó y por qué? | |
| Demo | `cd tecnologia && cp .env.example .env && docker compose up --build`, luego seguir `tecnologia/api/README.md` §3 |

## Retrospectiva

| ¿Qué salió bien? | ¿Qué mejorar? | Acción para el próximo sprint |
| :--- | :--- | :--- |
| | | |
