# Plan técnico · Spec 001 · APIs simuladas

> **Sprint:** 1 · **Spec:** [spec.md](spec.md) · **Código:** `tecnologia/simuladores/`

## 1. Decisiones

| Tema | Decisión | Motivo |
| :--- | :--- | :--- |
| Ubicación | Dos servicios aparte en `tecnologia/simuladores/`, **fuera** del backend | Así se comportan como sistemas externos reales: el backend los llama por HTTP, igual que haría con la PIDE o el proveedor de SMS |
| Lenguaje | Node.js 22 + TypeScript + Express 5 | Mismo stack que el backend (constitución §3) |
| Pruebas | `node:test` + `fetch` contra el servidor levantado en un puerto libre | Mismo estilo que el boilerplate; no requiere dependencias extra |
| Configuración | Variables de entorno, con valores por defecto para desarrollo | Cambian entre local y nube sin tocar el código (MP-03, MP-04, MP-05, MS-03, MS-04) |
| Persistencia | `personas.json` (PIDE) y un arreglo en memoria (SMS) | Suficiente para pruebas y demo (MP-01, MS-05) |
| Contenedores | Dockerfile multi-etapa (`node:22-alpine`), usuario sin privilegios y `HEALTHCHECK` sobre `/salud` | Imagen pequeña; Docker Compose espera a que estén sanos (CA-001-8) |

## 2. Archivos

```text
tecnologia/
├── docker-compose.yml               db (PostgreSQL) + mock-pide-reniec + mock-sms
├── .env.example                     Variables de desarrollo (copiar como .env)
└── simuladores/
    ├── mock-pide-reniec/
    │   ├── src/app.ts               crearApp(config): rutas /salud y /reniec/consulta-dni
    │   ├── src/server.ts            Lee las variables de entorno y levanta el puerto 4001
    │   ├── src/datos/personas.json  Personas ficticias (spec §3.3)
    │   ├── src/pruebas/pide.test.ts CA-001-1 a CA-001-5, MP-02, MP-04
    │   └── Dockerfile
    └── mock-sms/
        ├── src/app.ts               crearApp(config): /v1/mensajes (POST, GET, DELETE), /mensajes (HTML), /salud
        ├── src/server.ts            Puerto 4002
        ├── src/pruebas/sms.test.ts  CA-001-6, CA-001-7, MS-02 a MS-04, escape de HTML
        └── Dockerfile
```

`crearApp` recibe la configuración como parámetro (no lee `process.env`), para que cada prueba pueda levantar su propia instancia con la configuración que necesita, por ejemplo con la falla activada.

## 3. Orden de validación en `POST /reniec/consulta-dni`

1. `MOCK_FALLA=true` → 503 `9999` (el servicio entero está caído).
2. Credenciales de la entidad → 401 `1000`.
3. Formato del DNI → 400 `1001`.
4. DNI `79999999` → 503 `9999`.
5. Búsqueda en `personas.json` → `0001`, `0002` o `0000`.

## 4. Orden de validación en `POST /v1/mensajes`

1. `MOCK_FALLA=true` → 503.
2. `Authorization: Bearer <SMS_API_KEY>` → 401.
3. Formato del teléfono y longitud del texto → 400.
4. Teléfono `+51900000000` → 503.
5. Guardar y responder 202.

## 5. Cómo se verifica

| Criterio | Verificación |
| :--- | :--- |
| CA-001-1 … CA-001-7 | `npm test` en cada simulador (job **Pruebas** del CI) |
| CA-001-8 | Job **Docker Compose** del CI: `docker compose up --wait` y `curl` a `/salud` y a una consulta de DNI |
