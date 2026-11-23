# 03. Guía de despliegue (ADR-009)

> **Destino:** Neon (PostgreSQL) · Render (API y simuladores) · Vercel (frontend, Sprint 3).
> Todo es gratuito y no pide tarjeta de crédito. Necesitas iniciar sesión en cada servicio con tu cuenta de GitHub.

## 1. Base de datos en Neon

1. Entra a <https://neon.tech> → **New project** → nombre `hampi`, región **AWS US East (Ohio)** o la más cercana a la de Render.
2. En **Connection details** copia la *connection string*. Se ve así:
   `postgresql://usuario:clave@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Guárdala: es el valor de `DATABASE_URL`. **No la subas al repositorio.**

La API crea las tablas y carga los datos de prueba sola al iniciar (migraciones y semilla).

## 2. API y simuladores en Render

1. Entra a <https://render.com> → **New** → **Blueprint** → elige el repositorio `hampi-ayacucho-experimental`.
2. Render lee `render.yaml` y propone tres servicios: `hampi-mock-pide-reniec`, `hampi-mock-sms` y `hampi-api`.
3. Te pedirá los valores marcados como `sync: false`:

| Variable | Valor |
| :--- | :--- |
| `DATABASE_URL` | La cadena de Neon del paso 1 |
| `PIDE_URL` | `https://hampi-mock-pide-reniec.onrender.com` (la URL que Render asigne a ese servicio) |
| `SMS_URL` | `https://hampi-mock-sms.onrender.com` |
| `CORS_ORIGEN` | `http://localhost:4200` al principio; después se le agrega la URL de Vercel (paso 3.5) |

4. **Apply**. Las claves `JWT_SECRET`, `PIDE_PASSWORD` y `SMS_API_KEY` se generan solas y la API copia las de los simuladores.
5. Cuando los tres servicios estén en verde, prueba:
   - `https://hampi-api.onrender.com/salud` → `{"estado":"ok","servicio":"hampi-api"}`
   - `https://hampi-mock-sms.onrender.com/mensajes` → bandeja de SMS

Si la URL que te da Render es distinta (por ejemplo con un sufijo), usa esa en `PIDE_URL` y `SMS_URL`.

## 3. Frontend en Vercel

1. Entra a <https://vercel.com> → **Add New** → **Project** → importa `hampi-ayacucho-experimental`.
2. En **Root Directory** elige `tecnologia/web`. El resto lo toma de `vercel.json`
   (build `npm run build`, salida `dist/web/browser` y el *rewrite* de la SPA); no hay variables que configurar.
3. **Deploy**. Al terminar tendrás una URL como `https://hampi-ayacucho.vercel.app`.
4. **Apunta la web a la API.** Edita `tecnologia/web/public/configuracion.js` en el repositorio:

   ```js
   window.__HAMPI_API__ = 'https://hampi-api.onrender.com';
   ```

   Al guardar el cambio, Vercel vuelve a desplegar solo. (Se hace así, con un archivo que se sirve
   tal cual, para poder cambiar de servidor sin recompilar.)
5. **Permite el origen en la API.** En Render, en el servicio `hampi-api`, cambia `CORS_ORIGEN` a la
   URL de Vercel (se pueden poner varias separadas por comas, por ejemplo
   `https://hampi-ayacucho.vercel.app,http://localhost:4200`) y guarda: Render reinicia el servicio.
6. Entra a la URL de Vercel con el DNI `70000001` y la contraseña `Hampi2026`, y reserva una cita.

> Si al ingresar el navegador muestra un error de CORS o "No pudimos conectarnos con el servidor",
> casi siempre es el paso 4 o el 5: revisa que `configuracion.js` apunte a la API y que `CORS_ORIGEN`
> incluya exactamente la URL de Vercel (sin la barra final).

## 4. Antes de presentar

En el plan gratuito, Render "duerme" los servicios tras 15 minutos sin uso y el primero en despertar tarda de 30 a 60 segundos. **Abre las tres URLs de `/salud` y la web de Vercel unos minutos antes de la demo.** La API espera hasta 60 s a los simuladores (`SERVICIOS_TIEMPO_MAXIMO_MS`), así que una reserva no falla aunque estén dormidos, solo tarda más.

## 5. Plan B

Si la nube falla el día de la presentación, todo funciona igual en local:

```bash
cd tecnologia
cp .env.example .env
docker compose up --build
```
