# 00. Roadmap de sprints y despliegue - Hampi Ayacucho

> **Objetivo del producto (por ahora):** que un paciente ingrese al portal web con su número de documento y contraseña, consulte cupos y reserve una cita, y reciba su ficha con código QR.
> **Equipo Scrum:** Russell Kevin Alfaro Taipe (Product Owner, Scrum Master y Developer; proyecto individual).
> **Duración de sprint:** 1 semana (ajustable al calendario del curso).

---

## 1. Secuencia de sprints

| Sprint | Objetivo del sprint | Entregables principales | Despliegue |
| :--- | :--- | :--- | :--- |
| **0 · Preparación** | Dejar especificado **qué** se va a construir | Constitución SDD, specs 001–005, product backlog, DoR/DoD | — |
| **1 · Base y APIs simuladas** | Poder levantar el sistema completo en local | Estructura del repositorio `tecnologia/`, simuladores PIDE/RENIEC y SMS, Docker Compose, CI en GitHub Actions | **Local** con `docker compose up` |
| **2 · Backend** | API de Identidad y Citas funcionando y probada | Módulos `identidad` y `citas` (dominio, casos de uso, API REST), PostgreSQL, pruebas unitarias y de integración | **Entorno de pruebas** en la nube (API + simuladores + BD) |
| **3 · Frontend y entrega** | Flujo completo desde el navegador | Pantallas de login, registro, portal y reserva en Angular, demo final | **Despliegue público** con HTTPS y URL para la presentación |

Cada sprint termina con su **Sprint Review** (demo de lo terminado) y **Retrospectiva**, registradas en `docs/06-scrum/sprint-nn/`.

### Flujo de la aplicación al final del Sprint 3

```text
Login (n.º de documento + contraseña)
   ├── ¿Olvidaste tu contraseña?  → recuperar contraseña (código por SMS simulado)
   ├── Crear cuenta               → valida DNI con RENIEC simulado → crea contraseña
   └── Ingresar ──► Portal del paciente
                      ├── [Citas] ──► Reservar cita (especialidad → establecimiento → cupo → confirmar → ficha QR)
                      │            └► Mis citas
                      ├── [Historia clínica]  Próximamente
                      ├── [Referencias]       Próximamente
                      └── [Indicadores]       Próximamente (solo rol GERESA)
```

---

## 2. Arquitectura de despliegue

El sistema se compone de **cinco contenedores**. Los mismos sirven para local y para la nube; solo cambian las variables de entorno.

| Contenedor | Contenido | Puerto local |
| :--- | :--- | :--- |
| `web` | Aplicación Angular compilada, servida por Nginx | 4200 |
| `api` | Backend Hampi (monolito modular: `identidad`, `citas`, …) | 3000 |
| `db` | PostgreSQL | 5432 |
| `mock-pide-reniec` | Simulador del servicio de consulta de DNI | 4001 |
| `mock-sms` | Simulador del proveedor de SMS (guarda los mensajes y los muestra en `/mensajes`) | 4002 |

Redis se agrega como sexto contenedor solo si se ejecuta la prueba de rendimiento EQ-01.

```text
Navegador ──HTTPS──► web (Angular) ──REST /api/v1──► api (Express)
                                                     ├──► db (PostgreSQL)
                                                     ├──► mock-pide-reniec   (en real: PIDE / RENIEC)
                                                     └──► mock-sms           (en real: proveedor SMS)
```

Gracias a los puertos y adaptadores (P5 de la constitución), pasar del simulador al servicio real solo cambia la URL y el adaptador en la raíz de composición.

### Variables de entorno de `api`

| Variable | Ejemplo local | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgres://hampi:hampi@db:5432/hampi` | Conexión a PostgreSQL |
| `JWT_SECRET` | *(valor aleatorio, nunca en el repositorio)* | Firma de los tokens |
| `JWT_EXPIRA_EN` | `30m` | Vida del token de sesión |
| `PIDE_URL` | `http://mock-pide-reniec:4001` | URL del servicio de identidad |
| `SMS_URL` | `http://mock-sms:4002` | URL del proveedor de SMS |
| `CORS_ORIGEN` | `http://localhost:4200` | Único origen permitido para el navegador |

---

## 3. Opciones para la nube

Para un proyecto académico se busca costo cero. Es una **propuesta**: la elección final se registra como ADR en el Sprint 1.

| Opción | Frontend | API y simuladores | Base de datos | Ventaja | Desventaja |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A (recomendada)** | Vercel o Netlify | Render (servicios web gratuitos con Docker) | Neon (PostgreSQL gratuito) | Sin costo, HTTPS automático, despliegue al hacer push | El plan gratuito de Render "duerme" el servicio; la primera petición tarda ~30–60 s |
| B | Railway (todo junto) | Railway | Railway | Un solo panel, usa el mismo Docker Compose | Crédito gratuito limitado por mes |
| C | VPS (p. ej. con crédito estudiantil de GitHub Student Pack) | Docker Compose en la VPS | Contenedor `db` | Igual al entorno local | Hay que configurar dominio, HTTPS y mantenimiento |

**Consejo para la demo:** abrir la URL de la API unos minutos antes de presentar para "despertarla" (opción A).

### Pipeline (GitHub Actions)

```text
PR abierto ──► instalar ─► lint ─► pruebas unitarias ─► pruebas de integración (docker compose) ─► build
merge a main ──► lo anterior ─► despliegue automático (Sprint 2: api + simuladores; Sprint 3: también web)
```

---

## 4. Riesgos

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| No hay acceso a la PIDE/RENIEC ni a un proveedor SMS reales | No se puede probar la integración real | Simuladores con el mismo contrato (spec 005) |
| Tiempo limitado (proyecto individual) | Sprints incompletos | Priorizar el backlog por MoSCoW; lo "Could" se mueve al siguiente sprint |
| Plan gratuito de la nube cambia o se agota | Demo sin servidor | Mantener siempre funcionando el despliegue local con Docker Compose como plan B |
| Uso de datos personales reales | Incumplimiento de la Ley 29733 | Solo datos ficticios en seeds y demos (P6) |
