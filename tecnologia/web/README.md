# Web Hampi Ayacucho

Frontend en Angular 21 del módulo de citas. Entra por el ingreso estilo EsSalud Digital, muestra un
portal con una tarjeta por módulo (solo Citas está activo) y permite reservar, ver y cancelar citas.

| Pantalla | Ruta | Spec |
| :--- | :--- | :--- |
| Ingresar | `/ingresar` | [002](../../docs/05-desarrollo-sdd/specs/002-identidad-acceso/spec.md) §5.2 |
| Crear cuenta (2 pasos) | `/crear-cuenta` | 002 §5.1 |
| Recuperar contraseña (2 pasos) | `/recuperar` | 002 §5.4 |
| Portal de módulos | `/portal` | [003](../../docs/05-desarrollo-sdd/specs/003-portal-paciente/spec.md) |
| Reservar (4 pasos) | `/citas/reservar` | [004](../../docs/05-desarrollo-sdd/specs/004-consulta-disponibilidad/spec.md) · [005](../../docs/05-desarrollo-sdd/specs/005-reserva-cita/spec.md) |
| Mis citas | `/citas` | 005 §4.2 |
| Ficha con QR, PDF y cancelación | `/citas/{citaId}` | 005 §4.2 |

## 1. Estructura

```text
src/app/
├── nucleo/          textos.ts (todos los textos) · api.ts · modelos.ts · servicios · interceptor · guards · formato de fechas
├── componentes/     marco-acceso (pantalla partida del ingreso) · barra-portal (cabecera con sesión)
├── paginas/         ingresar · crear-cuenta · recuperar · portal · reservar · mis-citas · ficha
└── app.routes.ts    Rutas con carga diferida; todo lo del portal pasa por `sesionGuard`
```

- La sesión se guarda en `localStorage`. **"Recordar cuenta" guarda solo el número de documento**, nunca la contraseña (RI-10).
- `sesion.interceptor.ts` añade el token a cada llamada y, ante un 401, cierra la sesión y lleva al ingreso con el aviso "Tu sesión expiró" (CA-002-12).
- Los textos visibles están en `src/app/nucleo/textos.ts`, para revisarlos sin abrir las plantillas.

## 2. Ejecutar en local

Necesita la API en marcha (ver [`../api/README.md`](../api/README.md)) y los simuladores.

```bash
npm install
npm start           # http://localhost:4200
```

La URL de la API se lee de `public/configuracion.js` (`window.__HAMPI_API__`), así que se puede
apuntar a otro servidor sin recompilar. Por defecto es `http://localhost:3000`.

Cuentas de prueba (contraseña `Hampi2026`): DNI `70000001` a `70000003` como paciente;
`70000099` personal de salud, `70000098` especialista GERESA, `70000097` administrador.

## 3. Pruebas de punta a punta (Playwright)

Recorren el camino completo del paciente: crear cuenta, ingresar, portal, reserva paso a paso,
ficha con QR, descarga del PDF, mis citas y cancelación.

```bash
# Con la API (3000) y los simuladores (4001, 4002) en marcha:
npm run e2e                                # levanta la web solo si hace falta
WEB_URL=http://localhost:4200 npm run e2e  # contra una web ya levantada
```

## 4. Despliegue

- **Vercel:** raíz del proyecto `tecnologia/web`; `vercel.json` ya trae el build y el *rewrite* de la SPA. Después del despliegue hay que editar `public/configuracion.js` con la URL de la API en Render. Ver [la guía](../../docs/06-scrum/03-guia-de-despliegue.md).
- **Docker:** `docker compose up --build web` desde `tecnologia/` deja la web en <http://localhost:4200>.
