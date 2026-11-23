# Plan técnico · Spec 004 · Consulta de disponibilidad

> **Sprint:** 2 (backend) · **Spec:** [spec.md](spec.md) · **Código:** `tecnologia/api/src/modules/citas/`

## 1. Decisiones

| Tema | Decisión | Motivo |
| :--- | :--- | :--- |
| Zona horaria | Toda fecha de negocio se calcula en Lima (UTC−5 fijo) con `shared/dominio/fecha-lima.ts` | El "día" de RN-02, RN-05 y RN-06 es el día en Perú, no en UTC |
| Reloj | Puerto `Reloj` inyectado | Las pruebas fijan "ahora" (04/11/2026 10:00) y pueden adelantarlo |
| Cupos | Tabla `cupos` con índice parcial `(especialidad, establecimiento, fecha_hora) WHERE estado = 'DISPONIBLE'` | Consulta rápida sin caché (EQ-01) |
| Caché Redis | No se implementó en el Sprint 2 (prioridad *Could*). **Se implementó en el Sprint 4 con la [spec 006](../006-cache-y-validacion/spec.md)** | Cierra la brecha con ADR-004 |
| Semilla | `src/db/semilla.ts` genera cupos de lunes a sábado, 08:00–12:40 cada 20 min, desde hoy hasta 30 días; uno de cada cuatro ya `OCUPADO` | Ids deterministas (`hra-ped-20261105-0800`): sembrar de nuevo al reiniciar no duplica y extiende la ventana |

## 2. Endpoints

`GET /api/v1/citas/especialidades` · `/establecimientos?especialidadId=` · `/cupos?especialidadId=&establecimientoId=&fecha=` · `/cupos/fechas?especialidadId=&establecimientoId=`. Roles: `PACIENTE` y `PERSONAL_SALUD`.

## 3. Verificación

| Criterios | Prueba |
| :--- | :--- |
| CA-004-1 … CA-004-7 | `src/pruebas/api/citas.test.ts` (bloque "Spec 004") |
