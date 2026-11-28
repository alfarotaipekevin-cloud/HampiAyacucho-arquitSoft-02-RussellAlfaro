# Resultados de la colección de Postman (Newman)

Ejecución: 2026-11-28 00:13 UTC contra la API local con PostgreSQL y Redis.

| Métrica | Valor |
| :--- | ---: |
| Peticiones | 24 (0 fallidas) |
| Aserciones | 53 (0 fallidas) |
| Tiempo medio de respuesta | 25 ms |
| Tiempo máximo de respuesta | 232 ms |

| Petición | Método | Estado | Tiempo | Aserciones |
| :--- | :---: | :---: | ---: | :---: |
| Iniciar sesión como paciente | POST | 200 | 22 ms | 3/3 |
| Contraseña incorrecta (CA-002-7) | POST | 401 | 6 ms | 2/2 |
| Mis datos | GET | 200 | 3 ms | 2/2 |
| Módulos del portal | GET | 200 | 2 ms | 2/2 |
| Especialidades | GET | 200 | 3 ms | 3/3 |
| Establecimientos con Pediatría (RN-08) | GET | 200 | 4 ms | 2/2 |
| Días con cupos libres | GET | 200 | 7 ms | 3/3 |
| Cupos libres del día (caché Redis, ADR-004) | GET | 200 | 4 ms | 3/3 |
| Liberar citas anteriores del paciente | GET | 200 | 5 ms | 1/1 |
| Reservar una cita (HU02) | POST | 201 | 232 ms | 4/4 |
| El mismo cupo ya no está libre (RN-01) | POST | 409 | 210 ms | 2/2 |
| Mis citas (HU13) | GET | 200 | 21 ms | 2/2 |
| Ficha de la cita | GET | 200 | 15 ms | 2/2 |
| Reprogramar a otro horario (spec 008) | PATCH | 200 | 19 ms | 3/3 |
| Iniciar sesión como personal de salud | POST | 200 | 5 ms | 2/2 |
| Servicios del establecimiento (RA-01) | GET | 200 | 4 ms | 2/2 |
| Días de la semana con su conteo (RA-06) | GET | 200 | 7 ms | 2/2 |
| Agenda del día de la cita (solo consulta) | GET | 200 | 5 ms | 2/2 |
| Leer el QR de la ficha (RN-12) | GET | 200 | 5 ms | 3/3 |
| Sin token: 401 | GET | 401 | 2 ms | 2/2 |
| Paciente en admisión: 403 | GET | 403 | 2 ms | 2/2 |
| Personal no puede reservar: 403 | POST | 403 | 2 ms | 1/1 |
| Cita de otro usuario: 404 (CA-005-10) | GET | 403 | 2 ms | 1/1 |
| Cancelar la cita (RN-15) | PATCH | 200 | 6 ms | 2/2 |
