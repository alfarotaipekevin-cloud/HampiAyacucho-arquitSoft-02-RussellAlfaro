# Spec 004 · Consulta de disponibilidad de citas

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HU01 · RF01 · EQ-01 (rendimiento) |
| **Módulo** | `citas` |
| **Estado** | En revisión |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 2 (backend) · Sprint 3 (pantalla) |

---

## 1. Contexto

El paciente elige **especialidad**, luego **establecimiento** y luego **fecha**, y ve los cupos (horarios) libres. Es la consulta más frecuente del sistema (EQ-01), por eso los cupos se leen a través del repositorio con caché (Decorator del diseño interno).

## 2. Alcance

**Incluye:** catálogo de especialidades y establecimientos de la red de Ayacucho, cupos disponibles por fecha.
**No incluye:** creación de cupos por el personal (se cargan por seed), lista de espera, cupos por médico específico.

## 3. Modelo

| Entidad | Campos principales |
| :--- | :--- |
| `Establecimiento` | `id`, `nombre`, `nivel` (I-3, II-1, II-2…), `provincia`, `direccion` |
| `Especialidad` | `id`, `nombre` |
| `Cupo` | `id`, `establecimientoId`, `especialidadId`, `consultorio`, `medico` (nombre ficticio), `fechaHora`, `duracionMin`, `estado` (`DISPONIBLE` · `OCUPADO`) |

## 4. Reglas

| ID | Regla |
| :--- | :--- |
| RN-05 | Solo se muestran cupos con `fechaHora` posterior al momento de la consulta. |
| RN-06 | Solo se muestran cupos de hoy hasta **30 días** después (apertura mensual de cupos). |
| RN-07 | Un cupo `OCUPADO` nunca aparece como disponible; al reservar se invalida la caché del cupo (Decorator). |
| RN-08 | Solo se listan establecimientos que tengan la especialidad elegida. |

## 5. Contrato de API

Todos requieren token (`autenticarJwt`).

| Endpoint | Respuesta 200 |
| :--- | :--- |
| `GET /api/v1/citas/especialidades` | `[{ "id": "ped", "nombre": "Pediatría" }, …]` |
| `GET /api/v1/citas/establecimientos?especialidadId=ped` | `[{ "id": "hra", "nombre": "Hospital Regional de Ayacucho", "nivel": "II-2", "provincia": "Huamanga" }, …]` |
| `GET /api/v1/citas/cupos?especialidadId=ped&establecimientoId=hra&fecha=2026-11-05` | `[{ "id": "c-0012", "fechaHora": "2026-11-05T08:20:00-05:00", "consultorio": "Consultorio 3", "medico": "Dra. Ana Torres" }, …]` |
| `GET /api/v1/citas/cupos/fechas?especialidadId=ped&establecimientoId=hra` | Fechas con al menos un cupo libre (para marcar el calendario): `["2026-11-05", "2026-11-06"]` |

Errores: parámetros faltantes o fecha inválida → 400 `DATOS_INVALIDOS`; especialidad o establecimiento inexistente → 404.

## 6. Datos de prueba (seed)

| Establecimiento | Nivel | Especialidades |
| :--- | :--- | :--- |
| Hospital Regional de Ayacucho "Miguel Ángel Mariscal Llerena" | II-2 | Medicina general, Pediatría, Ginecología, Cardiología |
| Hospital de Apoyo de Huanta | II-1 | Medicina general, Pediatría, Ginecología |
| Centro de Salud San Juan Bautista | I-3 | Medicina general, Odontología |
| Centro de Salud Carmen Alto | I-3 | Medicina general, Odontología |

Cupos: de lunes a sábado, 08:00 a 13:00, cada 20 minutos, para los próximos 30 días; algunos ya `OCUPADO` para las pruebas. Nombres de médicos ficticios.

## 7. Criterios de aceptación

| ID | Dado | Cuando | Entonces |
| :--- | :--- | :--- | :--- |
| CA-004-1 | un paciente con sesión | pide las especialidades | recibe la lista de especialidades del seed |
| CA-004-2 | eligió Odontología | pide los establecimientos | solo aparecen los centros de salud San Juan Bautista y Carmen Alto (RN-08) |
| CA-004-3 | existen cupos libres y ocupados el 05/11 en Pediatría del Hospital Regional | consulta esa fecha | solo ve los libres, ordenados por hora |
| CA-004-4 | es el 05/11 a las 10:00 | consulta cupos de ese día | no aparecen los de las 08:00 a 10:00 (RN-05) |
| CA-004-5 | se consulta una fecha a más de 30 días | consulta | recibe una lista vacía (RN-06) |
| CA-004-6 | un cupo estaba en caché como disponible | otro paciente lo reserva | la siguiente consulta ya no lo muestra (RN-07) |
| CA-004-7 | falta el parámetro `fecha` | consulta cupos | responde 400 |
