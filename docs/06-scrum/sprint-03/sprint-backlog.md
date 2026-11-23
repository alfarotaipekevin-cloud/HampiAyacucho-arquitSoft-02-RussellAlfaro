# Sprint 3 · Web y cierre del módulo de citas

> **Objetivo del sprint:** que un paciente pueda hacer todo desde el navegador: crear su cuenta, ingresar, reservar su cita, ver la ficha con el QR, descargarla en PDF y cancelarla.
> **Fecha de inicio:** 2026-10-24 · **Historias:** HU09, HU10, HU11, HU12, HU01, HU02, HU13 (pantallas) · 24 puntos

## Sprint backlog

| # | Historia | Tarea | Entregable | Estado |
| :---: | :--- | :--- | :--- | :---: |
| 1 | HU11 | Recuperar contraseña con código por SMS (10 minutos, 3 intentos) | `src/modules/identidad/aplicacion/recuperar-contrasena.use-case.ts` | Hecho |
| 2 | HU11 | Tabla `codigos_recuperacion` y migración | `src/db/migraciones/002_recuperacion_contrasena.sql` | Hecho |
| 3 | HU13 | Ficha de la cita en PDF con el QR | `src/modules/citas/infraestructura/pdf-ficha.adapter.ts` | Hecho |
| 4 | HU13 | Cancelar la cita hasta 2 horas antes (RN-15) y liberar el cupo | `src/modules/citas/aplicacion/cancelar-cita.use-case.ts` | Hecho |
| 5 | HU10 | Pantalla de ingreso estilo EsSalud Digital, con *Recordar cuenta* | `tecnologia/web/src/app/paginas/ingresar/` | Hecho |
| 6 | HU09, HU11 | Crear cuenta y recuperar contraseña, cada una en dos pasos | `paginas/crear-cuenta/`, `paginas/recuperar/` | Hecho |
| 7 | HU12 | Portal con una tarjeta por módulo (Citas activo, el resto *Próximamente*) | `paginas/portal/` | Hecho |
| 8 | HU01, HU02 | Reserva en cuatro pasos: especialidad, establecimiento, día y hora, confirmar | `paginas/reservar/` | Hecho |
| 9 | HU13 | Ficha con QR, descarga del PDF, cancelación y "Mis citas" | `paginas/ficha/`, `paginas/mis-citas/` | Hecho |
| 10 | — | Guard de sesión e interceptor (401 → "Tu sesión expiró") | `src/app/nucleo/` | Hecho |
| 11 | — | Pruebas de punta a punta con Playwright | `tecnologia/web/e2e/reserva.spec.ts` (5 pruebas) | Hecho |
| 12 | HT03 | Web en Docker Compose (nginx, puerto 4200) y en el CI | `tecnologia/web/Dockerfile`, `ci.yml` | Hecho |
| 13 | HT04 | Configuración de Vercel y guía actualizada | `vercel.json`, `03-guia-de-despliegue.md` | Hecho |
| 14 | HT04 | Crear las cuentas de Neon, Render y Vercel y desplegar | Acción del Product Owner (necesita sus cuentas) | Pendiente |

**Movido a un sprint posterior:** reintentar las notificaciones SMS que quedan en `PENDIENTE` (RN-13)
y las pantallas del personal de salud (confirmar asistencia, `NO_ASISTIO`), que son de otro módulo.

## Cobertura de pruebas al cerrar el sprint

| Tipo | Cantidad | Dónde |
| :--- | :---: | :--- |
| Unitarias y de API (en memoria) | 57 | `tecnologia/api/src/pruebas/` |
| Integración (PostgreSQL y simuladores) | 6 | `tecnologia/api/src/pruebas/integracion/` |
| Punta a punta (navegador real) | 5 | `tecnologia/web/e2e/` |
| Simuladores | 14 | `tecnologia/simuladores/*/src/pruebas/` |

## Sprint Review

*Completar al cerrar el sprint.*

| Pregunta | Respuesta |
| :--- | :--- |
| ¿Qué se terminó? | |
| ¿Qué no se terminó y por qué? | |
| Demo | `cd tecnologia && docker compose up --build` · entrar en <http://localhost:4200> con el DNI `70000001` y la contraseña `Hampi2026` · reservar una cita y ver el SMS en <http://localhost:4002/mensajes> |

## Retrospectiva

| ¿Qué salió bien? | ¿Qué mejorar? | Acción para el próximo sprint |
| :--- | :--- | :--- |
| | | |
