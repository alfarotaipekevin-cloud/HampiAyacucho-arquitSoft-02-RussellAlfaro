# API Hampi Ayacucho

Backend del monolito modular (ADR-001) con Clean Architecture en cada módulo (ADR-002). Sigue la estructura del `boilerplate-clean-arquitecture`.

| Módulo | Qué hace | Spec |
| :--- | :--- | :--- |
| `identidad` | Crear cuenta validando el DNI con RENIEC, iniciar sesión, recuperar la contraseña por SMS, JWT, roles y bloqueo por intentos | [002](../../docs/05-desarrollo-sdd/specs/002-identidad-acceso/spec.md) |
| `portal` | Tarjetas de módulos por rol (Citas activo, el resto "Próximamente") | [003](../../docs/05-desarrollo-sdd/specs/003-portal-paciente/spec.md) |
| `citas` | Disponibilidad, reserva atómica con ficha QR y SMS, mis citas, ficha en PDF y cancelación | [004](../../docs/05-desarrollo-sdd/specs/004-consulta-disponibilidad/spec.md) · [005](../../docs/05-desarrollo-sdd/specs/005-reserva-cita/spec.md) |

## 1. Estructura

```text
src/
├── shared/                 Núcleo compartido: Dni, errores, fechas en Lima, reloj, clientes HTTP de PIDE y SMS
├── modules/
│   ├── identidad/          dominio · aplicacion · infraestructura · presentacion · identidad.module.ts · index.ts
│   ├── portal/
│   └── citas/
├── db/                     migraciones/*.sql · migrador.ts · semilla.ts (datos ficticios)
├── app.ts                  Une los módulos (raíz de composición de la aplicación)
├── infraestructura.ts      Elige memoria o PostgreSQL y los adaptadores PIDE/SMS
├── server.ts               Lee las variables de entorno y levanta el servidor
└── pruebas/                unitarias · api (en memoria) · integracion (PostgreSQL + simuladores)
```

Un módulo solo importa el `index.ts` de otro. Citas obtiene el celular del paciente a través de `identidad.consultarPerfil`, no de la tabla `usuarios` (constitución, P3).

## 2. Ejecutar

**Con Docker (recomendado):** desde `tecnologia/`, `cp .env.example .env && docker compose up --build`. La API queda en <http://localhost:3000>.

**Sin Docker:** necesita Node.js 22 y los simuladores en marcha (`npm start` en cada uno).

```bash
npm install
JWT_SECRET=un-secreto-local-de-al-menos-32-caracteres npm run dev   # sin DATABASE_URL guarda todo en memoria
```

## 3. Probar el flujo con curl

```bash
API=http://localhost:3000/api/v1
# 1. Crear cuenta (DNI ficticio del simulador RENIEC)
curl -X POST $API/identidad/registro -H "Content-Type: application/json" \
  -d '{"dni":"70000001","fechaNacimiento":"1990-04-15","celular":"987654321","contrasena":"Hampi2026","aceptaTratamientoDatos":true}'
# 2. Iniciar sesión y copiar el token
curl -X POST $API/identidad/sesion -H "Content-Type: application/json" -d '{"numeroDocumento":"70000001","contrasena":"Hampi2026"}'
TOKEN=...
# 3. Portal, fechas y cupos
curl $API/portal/modulos -H "Authorization: Bearer $TOKEN"
curl "$API/citas/cupos/fechas?especialidadId=ped&establecimientoId=hra" -H "Authorization: Bearer $TOKEN"
curl "$API/citas/cupos?especialidadId=ped&establecimientoId=hra&fecha=AAAA-MM-DD" -H "Authorization: Bearer $TOKEN"
# 4. Reservar y ver el SMS en http://localhost:4002/mensajes
curl -X POST $API/citas -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cupoId":"<id de un cupo>"}'
curl $API/citas/mias -H "Authorization: Bearer $TOKEN"
# 5. Descargar la ficha en PDF y cancelar la cita
curl -o ficha.pdf $API/citas/<citaId>/ficha.pdf -H "Authorization: Bearer $TOKEN"
curl -X PATCH $API/citas/<citaId>/cancelar -H "Authorization: Bearer $TOKEN"
```

Cuentas demo de otros roles (contraseña `Hampi2026`): `70000099` personal de salud, `70000098` especialista GERESA, `70000097` administrador.

## 4. Endpoints

Documentación interactiva **OpenAPI/Swagger**: <http://localhost:3000/api/docs> (contrato en `/api/docs/openapi.json`, fuente en `src/shared/http/openapi.ts`).

| Método y ruta | Rol | Spec |
| :--- | :--- | :--- |
| `POST /api/v1/identidad/registro/verificar` | público | 002 §5.1 |
| `POST /api/v1/identidad/registro` | público | 002 §5.1 |
| `POST /api/v1/identidad/sesion` | público | 002 §5.2 |
| `POST /api/v1/identidad/recuperacion` · `/recuperacion/confirmar` | público | 002 §5.4 |
| `GET /api/v1/identidad/yo` | con sesión | 002 §5.3 |
| `GET /api/v1/portal/modulos` | con sesión | 003 §5 |
| `GET /api/v1/citas/especialidades` · `/establecimientos` · `/cupos` · `/cupos/fechas` | PACIENTE, PERSONAL_SALUD | 004 §5 |
| `POST /api/v1/citas` · `GET /api/v1/citas/mias` · `GET /api/v1/citas/{id}` | PACIENTE | 005 §4 |
| `GET /api/v1/citas/{id}/ficha.pdf` · `PATCH /api/v1/citas/{id}/cancelar` | PACIENTE | 005 §4 |

Errores con el formato común: `{ "error": { "codigo": "CITA_DUPLICADA", "mensaje": "..." } }`.

## 5. Pruebas

Todas con **Jest** (ver [docs/07-validacion-calidad/02-pruebas-automatizadas-jest.md](../../docs/07-validacion-calidad/02-pruebas-automatizadas-jest.md)).

```bash
npm test                 # 110 pruebas: unitarias, de API y de calidad (EQ-02, EQ-04, EQ-06), en memoria
npm run test:cobertura   # lo mismo + reporte de cobertura en coverage/index.html
npm run test:calidad     # solo los escenarios de calidad, con detalle
# Integración: necesita docker compose up (db + redis + simuladores). BORRA usuarios y citas de esa base.
INTEGRACION_BD_DESECHABLE=true DATABASE_URL=postgres://hampi:hampi@localhost:5432/hampi REDIS_URL=redis://localhost:6379 npm run test:integracion
```

## 6. Variables de entorno

| Variable | Obligatoria | Por defecto |
| :--- | :---: | :--- |
| `JWT_SECRET` | sí (≥ 32 caracteres) | — |
| `DATABASE_URL` | no | sin ella, los datos se guardan en memoria |
| `PIDE_URL` · `PIDE_USUARIO` · `PIDE_PASSWORD` | no | `http://localhost:4001` · `40000000` · `clave-entidad` |
| `SMS_URL` · `SMS_API_KEY` | no | `http://localhost:4002` · `clave-sms-local` |
| `CORS_ORIGEN` | no | `http://localhost:4200` (varios, separados por comas) |
| `SERVICIOS_TIEMPO_MAXIMO_MS` | no | `5000` |
| `JWT_DURACION_SEGUNDOS` · `PORT` | no | `1800` · `3000` |
| `REDIS_URL` | no | sin ella, caché en memoria del proceso (ADR-004) |
| `CACHE_DESACTIVADA` | no | `false` (`true` solo para comparar en pruebas de carga) |
| `PG_POOL_MAX` | no | `20` conexiones por instancia |
| `CITAS_DEMO` | no | `false`. Con `true` (así viene en Docker Compose y Render) reserva cada día citas ficticias del Hospital Regional y de Huanta para que la demo de admisión nunca esté vacía; avanzan con la hora (`src/db/citas-demo.ts`) |
