# Spec 006 · Caché de disponibilidad, contrato OpenAPI y validación de calidad

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HT05 (caché), HT06 (documentación de la API), HT07 (validación de atributos de calidad) · RF01 · EQ-01 a EQ-06 · ADR-004 |
| **Módulo** | `citas` (caché), transversal (OpenAPI y pruebas) |
| **Estado** | Implementada · ver [plan.md](plan.md) |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 4 del equipo = **Sprint 2 del curso** (implementación y validación de la arquitectura) |

---

## 1. Contexto

La guía del Sprint 2 pide demostrar **con pruebas** que el código respeta las decisiones del Sprint 1. Al revisar el código frente a los ADR apareció una brecha: **ADR-004 decide una caché Redis para la disponibilidad, pero la API leía siempre de PostgreSQL** (spec 004 la había dejado como *Could*). Esta spec cierra esa brecha y define cómo se validan los atributos de calidad.

## 2. Alcance

**Incluye:**
- Caché distribuida de cupos libres con Redis, invalidación al reservar y cancelar, y degradación si Redis cae.
- Contrato OpenAPI 3 de las 16 operaciones y Swagger UI en `/api/docs`.
- Pruebas automatizadas con Jest (con cobertura) y su ejecución en GitHub Actions.
- Pruebas de los escenarios EQ-01 a EQ-06 con k6, Jest y axe-core.

**No incluye:** réplica de lectura de PostgreSQL (ADR-007; se justifica en el análisis de la BD), monitoreo en producción, traducción al quechua (EQ-05, queda pendiente).

## 3. Reglas

| ID | Regla |
| :--- | :--- |
| RC-01 | La caché guarda los cupos **libres de un día completo** por especialidad y establecimiento; la clave no depende de la hora de la consulta. |
| RC-02 | Toda reserva o cancelación borra la clave del día del cupo afectado, aunque la reserva falle por `CUPO_NO_DISPONIBLE`. |
| RC-03 | Las entradas vencen a los **60 segundos** (TTL) aunque no se invaliden. |
| RC-04 | Si Redis no responde, la consulta y la reserva se resuelven con PostgreSQL; la API **no** responde 5xx por culpa de la caché. |
| RC-05 | La reserva sigue siendo atómica en PostgreSQL (RN-11): la caché nunca decide si un cupo está libre al reservar. |
| RC-06 | Los casos de uso no conocen la caché (entra como Decorator en infraestructura). |
| RC-07 | Cada endpoint de Express está en el contrato OpenAPI y viceversa. |

## 4. Contrato

- `GET /api/docs` → Swagger UI · `GET /api/docs/openapi.json` → contrato OpenAPI 3.0.3.
- `GET /salud` → incluye `cache: { tipo, aciertos, fallos, errores, invalidaciones, tasaAciertos }`.
- Variables nuevas: `REDIS_URL` (sin ella se usa caché en memoria), `CACHE_DESACTIVADA=true` (para medir sin caché), `PG_POOL_MAX` (por defecto 20).

## 5. Criterios de aceptación

| ID | Dado | Cuando | Entonces |
| :--- | :--- | :--- | :--- |
| CA-006-1 | nadie consultó Pediatría del HRA el 05/11 | un paciente la consulta dos veces | la primera va a PostgreSQL (MISS) y la segunda sale de la caché (HIT) |
| CA-006-2 | los cupos del 05/11 están en caché | un paciente consulta a otra hora del mismo día | se reutiliza la misma clave |
| CA-006-3 | un cupo libre está en caché | otro paciente lo reserva | la siguiente consulta ya no lo muestra (= CA-004-6) |
| CA-006-4 | una cita reservada | el paciente la cancela | el cupo vuelve a aparecer en la siguiente consulta |
| CA-006-5 | Redis está caído | un paciente consulta cupos y reserva | ambas operaciones responden bien desde PostgreSQL |
| CA-006-6 | la API está levantada | se abre `/api/docs` | se ve Swagger UI con las 16 operaciones y el botón *Authorize* |
| CA-006-7 | el contrato OpenAPI | se recorre cada operación | todas existen en Express y las protegidas responden 401 sin token |
| CA-006-8 | 2,000 usuarios virtuales consultan la disponibilidad | se mide con k6 | p95 < 2 s y menos del 1 % de errores 5xx (EQ-01) |
| CA-006-9 | cada combinación credencial × endpoint protegido | se llama sin permiso | el 100 % responde 401 o 403 (EQ-04) |
| CA-006-10 | el código de `src/` | se analizan los imports | ningún archivo de dominio o aplicación depende de infraestructura (EQ-06) |

## 6. Tareas técnicas

| # | Tarea | Entregable |
| :---: | :--- | :--- |
| T1 | Puerto `Cache` y adaptadores `CacheRedis`, `CacheMemoria`, `SinCache` | `shared/dominio/cache.ts`, `shared/infraestructura/cache-*.ts` |
| T2 | Decoradores `CuposConCacheRepository` y `CitasConInvalidacionRepository` | `modules/citas/infraestructura/cache-cupos.ts` |
| T3 | Conectar la caché en la raíz de composición y exponer estadísticas en `/salud` | `infraestructura.ts`, `server.ts`, `app.ts` |
| T4 | Redis en Docker Compose y en el CI | `docker-compose.yml`, `.github/workflows/ci.yml` |
| T5 | Contrato OpenAPI y Swagger UI | `shared/http/openapi.ts` |
| T6 | Migrar las pruebas de `node:test` a Jest y generar cobertura | `jest.config.js` en cada paquete |
| T7 | Pruebas de calidad en Jest (EQ-02, EQ-04, EQ-06) | `src/pruebas/calidad/` |
| T8 | Pruebas de carga k6 (EQ-01, EQ-02) y balanceador | `tecnologia/pruebas-calidad/` |
| T9 | Auditoría de accesibilidad con axe-core (EQ-05) | `web/e2e/accesibilidad.spec.ts` |
| T10 | Análisis de la BD con `EXPLAIN ANALYZE` | `pruebas-calidad/bd/analisis-bd.sql` |
| T11 | Informe de evidencias | `docs/07-validacion-calidad/` |
