# Spec 008 · Reprogramar cita

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HU15 (cambiar la fecha u hora de una cita) · RF02 · RN-01, RN-02, RN-05, RN-06, RN-11, RN-13 |
| **Módulo** | `citas` (API) y web Angular (ficha de la cita, `/citas/:citaId`) |
| **Rol** | `PACIENTE` |
| **Estado** | Implementada |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 4 del equipo = **Sprint 2 del curso** |

---

## 1. Contexto

Hasta la spec 005, un paciente que no podía ir debía cancelar y volver a reservar. Mientras tanto otra persona podía ganarle el horario y el paciente perdía su código. Con reprogramar, el paciente elige otro horario libre del mismo servicio. El cambio es un solo paso atómico: si el nuevo horario ya no está libre, conserva su cita como estaba.

## 2. Alcance

**Incluye:**
- Botón "Cambiar fecha u hora" en la ficha de una cita reservada.
- Panel con los días y horas libres del **mismo servicio** (especialidad y establecimiento), con el cambio "Ahora → Nueva fecha" antes de confirmar.
- SMS con la nueva fecha por el simulador (`Hampi: cita reprogramada HAMPI-…`).

**No incluye:**
- Cambiar de especialidad o de establecimiento (eso es cancelar y reservar otra cita).
- Reprogramar una cita vencida.
- Recordatorio automático el día anterior.
- Envío de SMS reales (se evaluará Twilio).

## 3. Reglas

| ID | Regla |
| :--- | :--- |
| RR-01 | Solo se reprograma una cita `RESERVADA` cuya llegada no se registró. Una cita atendida o cancelada no se reprograma. |
| RR-02 | Se puede reprogramar hasta **2 horas antes** de la cita. Es el mismo plazo de la cancelación (RN-15). |
| RR-03 | Cada cita se reprograma **como máximo 2 veces** (columna `citas.reprogramaciones`). Después solo puede cancelarse. |
| RR-04 | El nuevo horario debe ser de la **misma especialidad y el mismo establecimiento**. |
| RR-05 | El nuevo cupo debe estar libre (RN-01), ser distinto del actual, estar en el futuro (RN-09) y caer dentro de los próximos 30 días (RN-05, RN-06). |
| RR-06 | No puede chocar con otra cita reservada del paciente en esa especialidad y ese día (RN-02). Moverla a otra hora del mismo día sí está permitido. |
| RR-07 | El **código y el QR no cambian**: la ficha impresa o guardada sigue sirviendo. |
| RR-08 | El cambio es **atómico** (RN-11): se ocupa el nuevo cupo, se libera el anterior y se mueve la cita en una transacción. Si otro paciente ganó el cupo, se responde `CUPO_NO_DISPONIBLE` y la cita queda igual. |
| RN-13 | Si el SMS falla, la cita queda reprogramada con la notificación `PENDIENTE`. |

## 4. Contrato (OpenAPI: etiqueta *Citas*)

| Método | Ruta | Cuerpo | Respuesta | Errores |
| :--- | :--- | :--- | :--- | :--- |
| PATCH | `/citas/{citaId}/reprogramar` | `{ "cupoId": "hra-ped-20261106-1000" }` | 200 · `Ficha` con la nueva fecha y `reprogramacionesRestantes` | 400 `DATOS_INVALIDOS` · 404 `CITA_NO_EXISTE`, `CUPO_NO_EXISTE` · 409 `CUPO_NO_DISPONIBLE`, `FUERA_DE_PLAZO`, `LIMITE_REPROGRAMACIONES`, `OTRO_SERVICIO`, `MISMO_CUPO`, `CUPO_VENCIDO`, `FUERA_DE_APERTURA`, `CITA_DUPLICADA`, `CITA_NO_RESERVADA`, `CITA_ATENDIDA`, `LLEGADA_YA_REGISTRADA`, `CITA_CAMBIADA` |

Solo el rol `PACIENTE` puede usarla, y solo sobre sus propias citas. La cita de otro paciente responde 404. EQ-04 lo comprueba con todos los roles.

La `Ficha` ahora incluye `especialidadId`, `establecimientoId` y `reprogramacionesRestantes`. Con esos datos la web consulta los cupos del mismo servicio.

## 5. Criterios de aceptación

| ID | Dado / Cuando / Entonces | Prueba |
| :--- | :--- | :--- |
| CA-008-1 | Dada una cita reservada, cuando la reprograma a un cupo libre del mismo servicio:<br>- la cita cambia de fecha y conserva su código;<br>- el cupo anterior vuelve a estar libre y se ve en la disponibilidad;<br>- se envía el SMS. | `pruebas/api/reprogramacion.test.ts` + `web/e2e/reserva.spec.ts` |
| CA-008-2 | Dada una cita ya reprogramada 2 veces, cuando intenta un tercer cambio, entonces recibe 409 `LIMITE_REPROGRAMACIONES` y nada cambia (RR-03). | ídem |
| CA-008-3 | Dada una cita a menos de 2 horas, cuando la reprograma, entonces recibe 409 `FUERA_DE_PLAZO` (RR-02). | ídem |
| CA-008-4 | Dado un cupo de otra especialidad o de otro establecimiento, cuando lo elige, entonces recibe 409 `OTRO_SERVICIO` (RR-04). | ídem |
| CA-008-5 | Dado un cupo ocupado o el mismo cupo, entonces recibe `CUPO_NO_DISPONIBLE` o `MISMO_CUPO`. Un cupo inexistente da 404 y un cuerpo sin `cupoId` da 400 (RR-05). | ídem |
| CA-008-6 | Dada otra cita del paciente en esa especialidad el día destino, cuando reprograma a ese día, entonces recibe `CITA_DUPLICADA`. Moverla dentro del mismo día sí funciona (RR-06). | ídem |
| CA-008-7 | Dadas una cita cancelada y la cita de otro paciente, entonces reciben `CITA_NO_RESERVADA` y 404 respectivamente (RR-01). | ídem |
| CA-008-8 | Dado el SMS caído, cuando reprograma, entonces la cita cambia y queda con la notificación `PENDIENTE` (RN-13). | ídem |
| CA-008-9 | Dados dos pacientes que reprograman al mismo cupo a la vez, entonces solo uno lo obtiene y el otro conserva su cita y su cupo (RR-08), en memoria y en PostgreSQL. | ídem + `pruebas/integracion/postgres.test.ts` |
| CA-008-10 | El panel de reprogramar no tiene errores de accesibilidad (EQ-05) y se ve bien a 390, 768 y 1440 px. | `web/e2e/accesibilidad.spec.ts` |

Las reglas del dominio también tienen pruebas unitarias en `pruebas/unitarias/dominio.test.ts`. Cada regla debe rechazar sin tocar los cupos ni la cita.

## 6. Plan técnico

- **Dominio** (`cita.ts`):
  - `Cita.reprogramar({ nuevoCupo, ahora, limiteApertura, yaTieneOtraCitaEseDia })` aplica RR-01 a RR-06 y devuelve el cupo anterior ya libre.
  - Nuevos datos: `reprogramaciones` y `reprogramacionesRestantes`.
- **Puerto** (`repositorios.ts`): `RepositorioCitas.reprogramar(cita, cupoAnterior)` es atómico (RR-08).
  - En PostgreSQL es una transacción:
    1. `UPDATE cupos … WHERE estado = 'DISPONIBLE'` sobre el nuevo cupo;
    2. `UPDATE citas … WHERE cupo_id = <anterior> AND reprogramaciones = n - 1` (si otra pestaña cambió la cita antes, responde `CITA_CAMBIADA`);
    3. se libera el cupo anterior.
  - El índice `citas_un_dia_por_especialidad` protege RN-02.
  - En caché se invalidan los dos días afectados (ADR-004).
- **Caso de uso**: `ReprogramarCitaUseCase`, que también envía el SMS con `AvisoCita.reprogramada = true`.
- **Migración**: `004_reprogramacion.sql` agrega `citas.reprogramaciones smallint DEFAULT 0 CHECK (0..2)`.
- **Web**: componente `Reprogramar` dentro de la ficha, que reutiliza el calendario y las horas de la reserva. Muestra "Ahora → Nueva fecha" y las reglas, y queda en la misma página al confirmar.
