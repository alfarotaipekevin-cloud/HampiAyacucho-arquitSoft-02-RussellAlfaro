# 04. Guía de exposición del Sprint 2

> Qué abrir o qué comando correr para mostrar cada actividad y entregable, **en el orden en que conviene presentarlo**.
> Pensada para **Windows + Docker Desktop + PowerShell**. Tiempo estimado: 15 a 20 minutos.
> Todos los comandos se escriben desde la carpeta del repositorio (por ejemplo `C:\Users\alfar\HampiAyacucho-arquitSoft-02-RussellAlfaro`).

## 0. Antes de la clase (10 minutos, en casa o al llegar)

```powershell
git checkout main; git pull
cd tecnologia
copy .env.example .env            # solo la primera vez
docker compose up -d --build --wait
docker compose ps                 # todos deben decir "running" o "healthy"
docker network ls                 # anota el nombre de la red: normalmente tecnologia_default
```

Deja abiertas estas pestañas en el navegador:

| Pestaña | Dirección |
| :--- | :--- |
| Aplicación web | <http://localhost:4200> |
| Swagger | <http://localhost:3000/api/docs> |
| Repositorio en GitHub | pestaña **Actions** (para mostrar el CI) |
| Este informe | `docs/07-validacion-calidad/` en GitHub |

Cuentas de prueba (contraseña **Hampi2026**): paciente **70000001**, personal de salud **70000099** (Hospital Regional) y **70000096** (Huanta).

**Si no hay internet o Docker falla:** todas las evidencias ya están guardadas en el repositorio (capturas en `docs/07-validacion-calidad/img/` y resultados en `tecnologia/pruebas-calidad/**/resultados/`). Puedes exponer solo con GitHub.

---

## Orden de la exposición

| # | Qué decir | Actividad de la guía |
| :---: | :--- | :--- |
| 1 | Arquitectura: estilo y enfoque | 1 y 2 |
| 2 | Especificaciones SDD | 3 |
| 3 | La aplicación funcionando | Entregable "primera versión funcional" |
| 4 | API REST con Swagger y Postman | 4 |
| 5 | Base de datos y caché | 5 |
| 6 | SOLID y patrones | 6 |
| 7 | Jest, cobertura y CI | 7 |
| 8 | Atributos de calidad (k6 2,000 usuarios, seguridad, accesibilidad, disponibilidad) | 8 |
| 9 | Cierre: ¿se respetaron los ADR? | Criterio de evaluación |

---

### 1. Arquitectura: monolito modular + Clean Architecture (actividades 1 y 2)

**Abrir** en VS Code o GitHub la carpeta `tecnologia/api/src/modules/`:

```text
modules/
  identidad/  dominio · aplicacion · infraestructura · presentacion
  citas/      dominio · aplicacion · infraestructura · presentacion
  portal/     aplicacion · presentacion
```

**Qué decir:** un solo despliegue (monolito modular, ADR-001) con módulos separados; cada módulo tiene sus capas y las dependencias apuntan hacia el dominio (Clean Architecture, ADR-002). Un módulo solo usa a otro por su `index.ts`.

**Demostrarlo con una prueba** (EQ-06, si tienes Node instalado):

```powershell
cd api; npm ci; npm run test:calidad; cd ..
```

Busca en la salida `EQ-06 · Mantenibilidad` (0 violaciones) y `EQ-04: 134 de 134 intentos no autorizados rechazados`.

### 2. Especificaciones SDD (actividad 3)

**Abrir** `docs/05-desarrollo-sdd/specs/`. Hay 8 specs (001 a 008). Muestra una completa, por ejemplo **007-admision-qr/spec.md**:
reglas (RA-01 a RA-06) → contrato de la API → criterios de aceptación *Dado / Cuando / Entonces* → plan y tareas técnicas.

**Qué decir:** cada criterio de aceptación tiene una prueba con su mismo código (por ejemplo `CA-007-10` en `api/src/pruebas/api/admision.test.ts`).

### 3. La aplicación funcionando (entregable "primera versión funcional")

En <http://localhost:4200>:

1. Ingresa como **paciente 70000001** → Reservar cita → elige especialidad, establecimiento, fecha y cupo → confirma. Muestra la ficha con el **código QR**.
2. En *Mis citas*, muestra **Reprogramar** (spec 008).
3. Cierra sesión e ingresa como **personal 70000099** → **Admisión** → elige el servicio. Aparecen las citas de hoy (hay citas de ejemplo cada día). Registra la llegada de un paciente leyendo su QR o escribiendo el código.
4. Muestra el **selector de días** (los próximos 7 días, solo consulta) y la **sala de espera** en <http://localhost:4200/sala-espera>.
5. Achica la ventana o abre la vista de celular (F12 → ícono de celular): todo es responsivo.

### 4. API REST documentada con OpenAPI/Swagger (actividad 4)

**Abrir** <http://localhost:3000/api/docs>. Son **23 operaciones** bajo `/api/v1` (ADR-003).

Demostración en vivo en Swagger:

1. `POST /identidad/sesion` → *Try it out* → `{"numeroDocumento":"70000001","contrasena":"Hampi2026"}` → copia el `token`.
2. Botón **Authorize** → pega el token.
3. `GET /citas/especialidades` → *Execute* → 200.

**Postman (opcional, muy visual):** en Postman *Import* → `tecnologia/pruebas-calidad/postman/hampi-api.postman_collection.json` → *Run collection*. Son 24 peticiones y 53 aserciones, todas en verde. Sin Postman, desde `tecnologia`:

```powershell
docker run --rm --network tecnologia_default -v "${PWD}\pruebas-calidad\postman:/etc/newman" postman/newman run hampi-api.postman_collection.json --env-var baseUrl=http://api:3000/api/v1
```

### 5. Análisis de la base de datos y la caché (actividad 5)

**Abrir** [01-analisis-base-de-datos-y-cache.md](01-analisis-base-de-datos-y-cache.md).

**Qué decir:** se probó la consulta de disponibilidad con **1.7 millones de cupos** usando `EXPLAIN ANALYZE`, se ajustaron los índices y se agregó **Redis con cache-aside** (ADR-004) con invalidación al reservar o cancelar. El resultado se ve en el paso 8: con caché el p95 baja de 3,474 ms a 924 ms.

### 6. SOLID y patrones (actividad 6)

**Abrir** `tecnologia/api/src/modules/citas/infraestructura/cache-cupos.ts`.

**Qué decir:** la caché es un **Decorator**: envuelve el repositorio sin cambiar ningún caso de uso (principio abierto/cerrado). Otros patrones: **Repository** (`postgres.repositories.ts` y `memoria.repositories.ts`, la misma interfaz), **Adapter** para la PIDE/RENIEC, el SMS, el PDF y el QR (`adaptadores.ts`, `pdf-ficha.adapter.ts`), y la **raíz de composición** en `src/infraestructura.ts` (inversión de dependencias). Detalle en `docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md`.

### 7. Jest, reporte de cobertura y CI (actividad 7)

**Lo más rápido:** abrir la captura [img/cobertura-jest.png](img/cobertura-jest.png) y el informe [02-pruebas-automatizadas-jest.md](02-pruebas-automatizadas-jest.md): **156 pruebas** en total y cobertura de la API de **94.6 % de líneas**.

**En vivo con Node instalado:**

```powershell
cd api; npm ci; npm run test:cobertura; start coverage\index.html; cd ..
```

**En vivo sin Node:** en GitHub → **Actions** → el último run verde de *CI* → abajo, en *Artifacts*, descarga **cobertura-api** y abre `index.html`. En la misma pantalla se ve que el CI corre en cada pull request: pruebas, cobertura, Docker Compose, integración y Playwright.

### 8. Atributos de calidad (actividad 8)

**Abrir** [03-validacion-atributos-calidad.md](03-validacion-atributos-calidad.md) y recorrer la tabla *Resumen* (EQ-01 a EQ-06).

**a) Rendimiento con 2,000 usuarios (EQ-01, k6).** Muestra los resultados guardados, que son la prueba completa:

| Archivo | Resultado |
| :--- | :--- |
| `tecnologia/pruebas-calidad/k6/resultados/eq01-con-redis.md` | 2,000 usuarios, p95 **924 ms**, 0 % de errores, 929 peticiones/s |
| `tecnologia/pruebas-calidad/k6/resultados/eq01-sin-cache.md` | Misma carga sin caché: p95 **3,474 ms** (no cumple los 2 s) |

Luego corre una **prueba corta en vivo** (unos 2 minutos, 200 usuarios) con k6 dentro de Docker, desde `tecnologia`:

```powershell
docker run --rm --network tecnologia_default -v "${PWD}\pruebas-calidad\k6:/k6" -w /k6 grafana/k6 run -e API_URL=http://api:3000 -e VU_MAX=200 -e ESCALA=0.3 -e ETIQUETA=demo-clase eq01-disponibilidad.js
```

Al final k6 muestra los umbrales con ✓ y deja el informe en `pruebas-calidad\k6\resultados\demo-clase.md`.

> No conviene correr los 2,000 usuarios en vivo: tarda varios minutos y depende de la laptop. Explica que se corrió así y que el resultado está guardado.

**b) Disponibilidad (EQ-02).** En el informe, sección EQ-02: con **2 instancias de la API y un balanceador** se apagó una instancia y Redis durante la carga, y hubo **0 errores** en 39,851 peticiones. Para mostrarlo en vivo:

```powershell
docker compose --profile alta-disponibilidad up -d --wait
start http://localhost:8080/salud
docker compose stop api           # se apaga una instancia...
start http://localhost:8080/salud # ...y el balanceador sigue respondiendo con api-2
docker compose start api
```

**c) Seguridad (EQ-04).** Resultado de `npm run test:calidad`: **134 de 134** intentos no autorizados rechazados (sin token, token alterado o vencido, rol equivocado) y 28 accesos legítimos permitidos.

**d) Accesibilidad (EQ-05).** `tecnologia/pruebas-calidad/accesibilidad/resultados/axe-resumen.md`: **0 errores** de WCAG 2.1 AA en **11 pantallas**, revisadas con axe-core en cada ejecución del CI.

**e) Escalabilidad (EQ-03).** Decir con honestidad: 15,000 usuarios no se pueden generar con recursos gratuitos; se demuestra la condición (API sin estado, caché compartida y varias instancias detrás de un balanceador).

### 9. Cierre: ¿se respetaron las decisiones del Sprint 1?

**Abrir** [00-resumen-sprint-2.md](00-resumen-sprint-2.md), sección 3. Cada ADR tiene su prueba. Mensaje final:

> Al comparar el código con los ADR encontramos que la caché de ADR-004 estaba documentada pero no implementada. La implementamos en este sprint y la prueba de carga con 2,000 usuarios demuestra por qué era necesaria: sin caché no se cumple el p95 de 2 segundos.

**Pendientes que conviene mencionar:** traducción al quechua (EQ-05), bitácora de auditoría y 2FA (ADR-005, son de la HCE) y el despliegue en la nube (ADR-009, configuración lista).

---

## Preguntas probables y dónde está la respuesta

| Pregunta | Respuesta corta | Dónde |
| :--- | :--- | :--- |
| ¿Por qué monolito modular y no microservicios? | Un equipo pequeño y un solo despliegue; los módulos ya están separados para dividirlos después | `docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md` (ADR-001) |
| ¿Cómo evitan que dos pacientes tomen el mismo cupo? | Bloqueo en PostgreSQL al reservar (RN-11); hay una prueba con 10 reservas simultáneas | `api/src/pruebas/integracion/` |
| ¿Por qué no prueban la carga en la nube? | El plan gratuito (0.1 CPU) mediría el plan y no la arquitectura | `tecnologia/pruebas-calidad/README.md` |
| ¿Qué pasa si RENIEC o el SMS se caen? | Se responde un error controlado, nunca 500 (EQ-02 con Jest) | `api/src/pruebas/calidad/eq02-*.test.ts` |
| ¿Los servicios del gobierno son reales? | No, son simuladores propios con el mismo contrato (ADR-008) | `tecnologia/simuladores/` |

## Si algo falla durante la clase

| Problema | Solución |
| :--- | :--- |
| La web no carga | `docker compose ps`; si algo está detenido, `docker compose up -d --wait` |
| No aparecen citas en Admisión | Revisa que `.env` tenga `CITAS_DEMO=true`. Los **domingos** no hay atención (no hay cupos ni citas ese día): si expones un domingo, reserva para el lunes y muéstralo con el selector de días |
| El comando `docker run ... k6` dice que la red no existe | Cambia `tecnologia_default` por el nombre que muestra `docker network ls` |
| Quieres empezar de cero | `docker compose down -v; docker compose up -d --build --wait` (borra los datos locales) |
