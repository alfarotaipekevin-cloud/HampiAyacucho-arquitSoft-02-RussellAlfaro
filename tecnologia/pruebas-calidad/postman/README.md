# Colección Postman de la API de Hampi

`hampi-api.postman_collection.json` recorre el flujo completo del módulo de citas contra la API levantada con Docker Compose. Cada petición tiene aserciones (código HTTP, cuerpo y reglas de negocio).

| Carpeta | Qué prueba |
| :--- | :--- |
| 1. Identidad | Ingreso del paciente, contraseña errada (401), datos de la sesión |
| 2. Portal y disponibilidad | Módulos, especialidades, establecimientos, fechas y cupos |
| 3. Reserva | Reservar (201), RN-01 una cita activa por especialidad (409), mis citas, ficha, reprogramar (RR-03, RR-07) |
| 4. Admisión | Ingreso del personal, servicios, días (RA-06), agenda y lectura del código QR |
| 5. Seguridad (EQ-04) | Sin token (401), rol equivocado (403), recurso inexistente (404) |
| 6. Limpieza | Cancela la cita creada para que la colección se pueda repetir |

## Cómo ejecutarla

Primero levanta la aplicación: `cd tecnologia; docker compose up -d --build --wait`.

**En Postman:** *Import* → elige `hampi-api.postman_collection.json` → clic derecho en la colección → *Run collection* → *Run*.

**Con Newman, sin instalar nada (Docker, PowerShell desde `tecnologia`):**

```powershell
docker run --rm --network tecnologia_default -v "${PWD}\pruebas-calidad\postman:/etc/newman" postman/newman run hampi-api.postman_collection.json --env-var baseUrl=http://api:3000/api/v1
```

**Con Newman y Node instalado:** `npx newman run pruebas-calidad/postman/hampi-api.postman_collection.json`

Último resultado (28/11/2026): 24 peticiones, **53 de 53 aserciones correctas**. Detalle en [resultados/newman-resumen.md](resultados/newman-resumen.md).
