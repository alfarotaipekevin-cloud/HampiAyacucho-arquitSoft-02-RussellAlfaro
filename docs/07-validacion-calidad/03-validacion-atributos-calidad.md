# 03. Validación de los atributos de calidad

> **Sprint 2 del curso · Actividad 8.** Entregable: *evidencias y resultados de validación de los atributos de calidad*.
> Escenarios: [08-escenarios-atributos-calidad.md](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md) · Scripts: [`tecnologia/pruebas-calidad/`](../../tecnologia/pruebas-calidad/README.md).
> Fecha de ejecución: 22/11/2026.

## Resumen

| Escenario | Medida | Herramienta | Resultado | ¿Cumple? |
| :--- | :--- | :--- | :--- | :---: |
| **EQ-01** Rendimiento | p95 ≤ 2 s y < 1 % de errores 5xx | k6, hasta **2,000 usuarios** | p95 **924 ms**, 0 % de errores, 929 peticiones/s (con Redis) | ✅ |
| **EQ-02** Disponibilidad | La operación sigue respondiendo si falla una instancia o un servicio externo | k6 + 2 instancias + balanceador; Jest | **0 errores** en 39,851 peticiones mientras se apagaron una instancia y Redis | ✅ |
| **EQ-03** Escalabilidad | 15,000 usuarios, p95 < 3 s | k6 (tendencia) | No ejecutable con recursos gratuitos; se demuestra la condición (API sin estado + caché compartida) | ⚠️ Parcial |
| **EQ-04** Seguridad | 100 % de intentos no autorizados rechazados | Jest (matriz) | **78 de 78** rechazados (401/403); 21 accesos legítimos permitidos | ✅ (sin bitácora) |
| **EQ-05** Accesibilidad | 0 errores críticos WCAG 2.1 AA | axe-core + Playwright | **0 críticos** y 0 graves en 6 pantallas (se corrigió 1 de contraste) | ✅ (sin quechua) |
| **EQ-06** Mantenibilidad | Ningún import de `dominio/` apunta a infraestructura | Jest (análisis de imports) | **0 violaciones** de la regla de dependencias ni entre módulos | ✅ |

---

## Entorno de prueba

| Elemento | Valor |
| :--- | :--- |
| Máquina | Linux x86-64, 16 GB de RAM (contenedor de desarrollo) |
| API | 1 proceso Node.js 22 (o 2 en EQ-02), PostgreSQL 16, Redis 7 |
| Generador de carga | k6 v0.54 en la misma máquina |
| Datos | Semilla del sistema: 5 especialidades, 4 establecimientos, 11 ofertas, 31 días de cupos |

> Por qué no contra Render: el plan gratuito ofrece 0.1 CPU y 512 MB; con 2,000 usuarios se mediría el límite del plan y no la arquitectura. Los resultados son de **una sola instancia**; en producción la API escala horizontalmente (EQ-03).

---

## EQ-01 · Rendimiento de la consulta de disponibilidad

**Script:** `k6/eq01-disponibilidad.js`. Cada usuario virtual abre el calendario (`/cupos/fechas`), elige un día al azar, consulta `/cupos` y espera de 1 a 2 s. La carga sube **200 → 500 → 1,000 → 2,000** usuarios en 2 minutos y se mantiene 1 minuto con **2,000 concurrentes**.

| Métrica | Con caché Redis (ADR-004) | Sin caché (`CACHE_DESACTIVADA=true`) |
| :--- | ---: | ---: |
| Peticiones atendidas | **187,426** | 92,388 |
| Peticiones por segundo | **929** | 458 |
| `/cupos` · mediana | 515 ms | 1,571 ms |
| `/cupos` · **p95** | **924 ms** | **3,474 ms** |
| `/cupos` · p99 | 1,168 ms | 3,660 ms |
| `/cupos` · máximo | 1,843 ms | 3,738 ms |
| Errores 5xx | 0 % | 0 % |
| Umbral p95 < 2 s | ✅ **CUMPLE** | ❌ NO CUMPLE |
| Tasa de aciertos de la caché | 99.6 % (2,997,843 aciertos / 13,421 fallos) | — |

Evidencia: `k6/resultados/eq01-con-redis.md|json`, `k6/resultados/eq01-sin-cache.md|json`.

**Análisis:**
- Con la caché, la API atiende **el doble de peticiones** y el p95 baja **3.8 veces**. Sin la caché, el mismo hardware no cumple la meta: la decisión ADR-004 queda **justificada con datos**.
- No hubo errores en ninguna de las dos pruebas: cuando la API se satura, las peticiones esperan en cola en vez de fallar.
- El tiempo que queda con caché es CPU de Node.js (validar el JWT, serializar JSON, 31 lecturas a Redis para el calendario). La siguiente mejora sería guardar el calendario de 30 días en una sola clave.
- **Meta ajustada:** el Sprint 1 proponía 5,000 usuarios; la guía del Sprint 2 fija 2,000, que se cumple con **una** instancia. Para 5,000 se usarían 3 instancias (ver EQ-03).

## EQ-02 · Disponibilidad

### a) Carga con fallas reales (k6)

**Script:** `disponibilidad/ejecutar-eq02.sh`. Levanta **2 instancias** de la API detrás de un balanceador (`balanceador.mjs`, equivalente a `nginx.conf` del perfil `alta-disponibilidad` de Docker Compose) y aplica **300 usuarios constantes** durante 100 s mientras provoca fallas:

| Hora | Evento |
| :--- | :--- |
| 01:47:01 | Inicio: 2 instancias sanas, Redis activo |
| 01:47:31 | **Se mata la instancia 1** (`kill -9`) |
| 01:47:56 | **Se apaga Redis** |
| 01:48:16 | Redis vuelve |
| 01:48:21 | La instancia 1 vuelve |

| Resultado | Valor |
| :--- | ---: |
| Peticiones | 39,851 |
| **Respuestas con error** | **0 (0.000 %)** |
| p95 | 3.0 ms |
| Máximo (durante la caída) | 292 ms |
| Peticiones que el balanceador reintentó en la otra instancia | 1 |
| Lecturas que fueron a PostgreSQL porque Redis estaba caído | 16,746 (errores de caché absorbidos) |

Evidencia: `k6/resultados/eq02-disponibilidad.md|json`, `disponibilidad/resultados/eq02-eventos.log`.

### b) Fallas de servicios externos (Jest, en el CI)

`api/src/pruebas/calidad/eq02-disponibilidad.test.ts`:

| Falla | Respuesta del sistema | Resultado |
| :--- | :--- | :---: |
| RENIEC (PIDE) no responde | `503 SERVICIO_IDENTIDAD_NO_DISPONIBLE` con mensaje comprensible; el cupo sigue libre (RN-14) | ✅ |
| El SMS no responde | La cita se reserva y queda con notificación `PENDIENTE` (RN-13) | ✅ |
| Redis no responde | Consulta y reserva se resuelven con PostgreSQL | ✅ |
| JSON mal formado o ruta inexistente | 400 / 404, la API sigue viva | ✅ |

**Pendiente:** la meta de 99.9 % mensual solo se puede medir con monitoreo en producción (HT04, despliegue).

## EQ-03 · Escalabilidad

No es posible generar 15,000 usuarios virtuales con una sola máquina ni con planes gratuitos (k6 necesita ~1 GB de RAM por cada 1,000–2,000 usuarios y la API, varias CPU). Lo que sí se demuestra:

1. **La API no guarda estado** (JWT, sin sesión en memoria): cualquier instancia atiende cualquier petición. EQ-02 lo prueba con 2 instancias y el balanceador.
2. **La caché es compartida** (Redis), así que agregar instancias no multiplica las consultas a PostgreSQL.
3. **Tendencia medida:** una instancia sostiene 2,000 usuarios con p95 de 924 ms a ~930 peticiones/s. Con escalamiento lineal, 15,000 usuarios necesitarían unas **8 instancias**; PostgreSQL no sería el cuello de botella porque el 99.6 % de las lecturas sale de Redis.

**Estado:** parcialmente validado. Se propone revisar la meta con la GERESA.

## EQ-04 · Seguridad

`api/src/pruebas/calidad/eq04-seguridad.test.ts` recorre **todas las operaciones protegidas del contrato OpenAPI** (11) con 9 tipos de credencial:

| Credencial | Respuesta esperada | Resultado |
| :--- | :--- | :---: |
| Sin token, token alterado, vencido, firmado con otra clave, con `alg: none` | 401 `SESION_REQUERIDA` en las 11 operaciones (55 intentos) | ✅ 55/55 |
| `ESPECIALISTA_GERESA`, `ADMINISTRADOR` en operaciones de citas; `PERSONAL_SALUD` en operaciones solo de pacientes | 403 `ROL_NO_AUTORIZADO` (23 intentos) | ✅ 23/23 |
| Roles con permiso | Acceso permitido (21 accesos) | ✅ |
| Errores | Sin trazas, SQL ni hashes en el cuerpo; sin cabecera `X-Powered-By` | ✅ |

**Total: 78 de 78 intentos no autorizados rechazados (100 %).** Otras pruebas de seguridad del módulo: contraseñas con bcrypt, bloqueo de la cuenta al quinto intento (CA-002-8), un paciente no puede ver la cita de otro (CA-005-10).

**Fuera del alcance:** la bitácora de auditoría y el 2FA de ADR-005 son para la HCE y el personal de salud, módulos que no entran en este semestre. El cifrado en tránsito (HTTPS) lo dan Vercel y Render al desplegar.

## EQ-05 · Accesibilidad

`web/e2e/accesibilidad.spec.ts` audita con **axe-core** (reglas WCAG 2.0/2.1 A y AA) las pantallas del flujo de reserva:

| Pantalla | Críticas | Graves | Moderadas | Leves |
| :--- | ---: | ---: | ---: | ---: |
| Ingresar | 0 | 0 | 0 | 0 |
| Crear cuenta | 0 | 0 | 0 | 0 |
| Recuperar contraseña | 0 | 0 | 0 | 0 |
| Portal | 0 | 0 | 0 | 0 |
| Mis citas | 0 | 0 | 0 | 0 |
| Reservar cita (paso 1) | 0 | 0 | 0 | 0 |

- En la primera ejecución el **Portal** tenía 1 error grave de contraste (`color-contrast`): las tarjetas *Próximamente* usaban `opacity: 0.55`. Se cambió por fondo gris y borde punteado y la auditoría quedó en 0. Es un ejemplo de cómo la prueba detecta y evita regresiones.
- También se comprueba que el formulario de ingreso se completa solo con el teclado.

**Pendiente:** la traducción al quechua (50 % de la medida) no está implementada; requiere validar los textos con hablantes de quechua ayacuchano.

## EQ-06 · Mantenibilidad

`api/src/pruebas/calidad/eq06-mantenibilidad.test.ts` analiza los `import` de todo `src/` en cada ejecución del CI:

| Regla | Decisión | Resultado |
| :--- | :--- | :---: |
| `dominio/` no importa aplicación, infraestructura, presentación ni librerías (express, pg, redis, jsonwebtoken, bcrypt…) | ADR-002 | ✅ 0 violaciones |
| `aplicacion/` no importa infraestructura ni presentación | ADR-002 | ✅ 0 violaciones |
| Un módulo solo usa otro por su `index.ts` | ADR-001 | ✅ 0 violaciones |
| Los casos de uso no conocen la caché | ADR-004 + Decorator | ✅ |
| Cada módulo con lógica tiene sus 4 capas | ADR-002 | ✅ |

Para comprobar que la prueba funciona se agregaron a propósito dos imports prohibidos (`pg` en `cupo.ts` y una ruta de Identidad en un caso de uso de Citas) y la prueba los detectó; luego se quitaron.

**Ejemplo real de mantenibilidad en este sprint:** la caché Redis se agregó **sin modificar ningún caso de uso ni entidad**: solo dos decoradores nuevos y la raíz de composición. Las 57 pruebas anteriores pasaron sin cambios de lógica.
