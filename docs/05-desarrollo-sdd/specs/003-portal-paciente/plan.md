# Plan técnico · Spec 003 · Portal por módulos

> **Sprint:** 2 (endpoint) · **Spec:** [spec.md](spec.md) · **Código:** `tecnologia/api/src/modules/portal/`

- `CatalogoModulos` guarda las tarjetas por `clave` y filtra por rol (RP-02); las activas van primero.
- `MODULOS_PLANIFICADOS` contiene las tarjetas *Próximamente* (HCE, Referencias, Indicadores, Auditoría).
- Cada módulo construido exporta su tarjeta (`TARJETA_CITAS` en `citas.module.ts`) y `app.ts` se la pasa a `crearModuloPortal` (RP-04). Al registrar una tarjeta con la misma clave que una planificada, la reemplaza.
- La respuesta no incluye la lista de roles de cada tarjeta.

**Sprint 3 · pantalla.** `paginas/portal` pinta una tarjeta por módulo: las activas con el botón
*Entrar* y las planificadas atenuadas con la insignia *Próximamente*, sin enlace (RP-03, RP-04).
`sesionGuard` manda al ingreso a quien entre sin sesión y `invitadoGuard` evita que quien ya tiene
sesión vuelva al ingreso (RP-01, RP-05). Cuando la API responde 401, el interceptor cierra la sesión
y lleva al ingreso con el aviso "Tu sesión expiró".

| Criterios | Prueba |
| :--- | :--- |
| CA-003-1, CA-003-2, CA-003-3 (API) | `src/pruebas/api/citas.test.ts` (bloque "Spec 003") |
| CA-003-1 y CA-003-3 en el navegador | `tecnologia/web/e2e/reserva.spec.ts` |
