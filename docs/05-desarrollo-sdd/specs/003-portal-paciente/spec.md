# Spec 003 · Portal de inicio por módulos

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HU12 (portal de inicio) · ADR-001 (monolito modular) · EQ-06 (mantenibilidad) |
| **Módulo** | `portal` (backend: registro de módulos · frontend: página de inicio) |
| **Estado** | En revisión |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 2 (endpoint) · Sprint 3 (pantalla) |

---

## 1. Contexto

Después del login el usuario **no** entra directamente a la reserva, sino a un **portal** con una tarjeta por cada módulo de Hampi. Hoy solo **Citas** está activo; el resto aparece como *Próximamente*. Así el proyecto puede crecer: agregar un módulo nuevo significa registrar su tarjeta, no rehacer la navegación.

## 2. Alcance

**Incluye:** catálogo de módulos con su estado y los roles que lo ven; página de inicio con saludo, tarjetas y cierre de sesión.
**No incluye:** notificaciones dentro del portal, configuración del perfil.

## 3. Catálogo de módulos

| Clave | Nombre | Roles que lo ven | Estado actual | Ruta del frontend |
| :--- | :--- | :--- | :--- | :--- |
| `citas` | Citas | `PACIENTE`, `PERSONAL_SALUD` | **ACTIVO** | `/citas` |
| `hce` | Historia clínica | `PACIENTE` (solo lectura), `PERSONAL_SALUD` | PROXIMAMENTE | `/hce` |
| `referencias` | Referencias | `PERSONAL_SALUD` | PROXIMAMENTE | `/referencias` |
| `indicadores` | Indicadores GERESA | `ESPECIALISTA_GERESA` | PROXIMAMENTE | `/indicadores` |
| `auditoria` | Auditoría | `ADMINISTRADOR` | PROXIMAMENTE | `/auditoria` |

## 4. Reglas

| ID | Regla |
| :--- | :--- |
| RP-01 | El portal solo se muestra con sesión válida; sin sesión, el frontend redirige al login. |
| RP-02 | Cada rol ve solo las tarjetas de su rol. |
| RP-03 | Una tarjeta `PROXIMAMENTE` se ve atenuada, no es clicable y muestra la etiqueta "Próximamente". |
| RP-04 | Cada módulo del backend registra su tarjeta en el catálogo desde su propio `index.ts`; el portal no conoce los módulos de antemano. |
| RP-05 | Al vencer el token (30 min), cualquier pantalla redirige al login con el mensaje "Tu sesión expiró". |

## 5. Contrato de API

`GET /api/v1/portal/modulos` (requiere token)

```json
// 200 OK para un PACIENTE
{
  "usuario": { "nombre": "María Elena", "rol": "PACIENTE" },
  "modulos": [
    { "clave": "citas", "nombre": "Citas", "descripcion": "Reserva y consulta tus citas", "estado": "ACTIVO", "ruta": "/citas" },
    { "clave": "hce", "nombre": "Historia clínica", "descripcion": "Consulta tus atenciones", "estado": "PROXIMAMENTE", "ruta": "/hce" }
  ]
}
```

## 6. Cómo se agrega un módulo en el futuro

1. Crear `src/modules/<modulo>/` con la estructura de Clean Architecture del diseño interno.
2. En su `index.ts`, registrar las rutas `/api/v1/<modulo>` y su tarjeta en el catálogo.
3. En el frontend, crear el módulo Angular con carga diferida (`loadChildren`) en la ruta indicada, protegido por el guard de sesión.
4. Cambiar el estado de la tarjeta a `ACTIVO`.

El login, el JWT, los roles y el portal se reutilizan sin cambios.

## 7. Criterios de aceptación

| ID | Dado | Cuando | Entonces |
| :--- | :--- | :--- | :--- |
| CA-003-1 | un `PACIENTE` con sesión | abre el portal | ve el saludo con su nombre, la tarjeta **Citas** activa y **Historia clínica** como *Próximamente* |
| CA-003-2 | un `ESPECIALISTA_GERESA` con sesión | abre el portal | ve **Indicadores GERESA** y no ve **Citas** |
| CA-003-3 | un usuario sin sesión | entra a `/portal` o `/citas` | es enviado al login |
| CA-003-4 | un `PACIENTE` en el portal | hace clic en una tarjeta *Próximamente* | no navega a ninguna parte |
| CA-003-5 | un usuario con sesión | pulsa **Cerrar sesión** | se borra el token y vuelve al login |
