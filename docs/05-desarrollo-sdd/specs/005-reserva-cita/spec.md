# Spec 005 · Reserva de cita y ficha QR

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HU02 · RF02, RF03 · HU13 (mis citas) · EQ-02 (disponibilidad) |
| **Módulo** | `citas` |
| **Estado** | En revisión |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 2 (backend) · Sprint 3 (pantalla) |

---

## 1. Contexto

Es el núcleo del módulo y el caso de uso modelado en el diseño interno (`ReservarCitaUseCase`). El paciente, ya autenticado, elige un cupo, confirma y recibe una **ficha digital con código QR**, que también le llega por SMS.

### Cambio respecto al diseño interno v1.0

En el diseño entregado, `POST /api/v1/citas` recibía `dni` y `cupoId`. Ahora el paciente ya inició sesión, así que **el DNI se toma del token** y el cuerpo solo lleva `cupoId`. Se mantiene la llamada a `ValidadorIdentidad` en la reserva para confirmar que el DNI sigue vigente (p. ej. sin restricción) antes de ocupar el cupo. El resto del flujo (pasos 2 a 18 del diagrama de secuencia) no cambia. Se actualizará el diagrama en el Sprint 2.

## 2. Alcance

**Incluye:** confirmar reserva, generar ficha con QR, descargarla, enviar SMS, listar "Mis citas".
**Debería (si alcanza el tiempo):** cancelar una cita (RN-03 ya existe en el dominio).
**No incluye:** reprogramar, pago, reservar para otra persona (hijos/dependientes), confirmar asistencia (lo hará el personal de salud en un módulo futuro).

## 3. Reglas

Se mantienen las reglas del diseño interno y se agregan las nuevas.

| ID | Regla | Origen |
| :--- | :--- | :--- |
| RN-00 | El DNI tiene 8 dígitos | Diseño interno |
| RN-01 | Solo se puede reservar un cupo disponible | Diseño interno |
| RN-02 | Un paciente no puede tener dos citas en la misma especialidad el mismo día | Diseño interno |
| RN-03 | Una cita atendida no puede cancelarse; al cancelar se libera el cupo | Diseño interno |
| RN-04 | Solo una cita reservada puede marcarse como atendida | Diseño interno |
| RN-09 | No se puede reservar un cupo cuya hora ya pasó | Nueva |
| RN-10 | Un paciente puede tener como máximo **3 citas en estado RESERVADA** a la vez | Nueva |
| RN-11 | Si dos pacientes reservan el mismo cupo al mismo tiempo, **solo uno** lo obtiene (transacción con bloqueo en BD) | Nueva |
| RN-12 | El código de la ficha es `HAMPI-XXXXXXXX`; el QR contiene **solo ese código**, sin datos personales (Ley 29733) | Nueva |
| RN-13 | Si el SMS falla, la cita **sigue reservada**; la notificación queda como `PENDIENTE` para reintentarse (EQ-02) | Nueva |
| RN-14 | Si RENIEC no responde, **no** se reserva y se informa el error de forma controlada | Nueva |
| RN-15 | Cancelar solo es posible hasta **2 horas antes** de la cita | Nueva (Debería) |

## 4. Contrato de API

Todos requieren token con rol `PACIENTE`.

### 4.1 Reservar — `POST /api/v1/citas`

```json
// petición
{ "cupoId": "c-0012" }

// 201 Created
{
  "citaId": "a3b9…",
  "codigo": "HAMPI-1A2B3C4D",
  "estado": "RESERVADA",
  "paciente": "María Elena Quispe Huamán",
  "especialidad": "Pediatría",
  "establecimiento": "Hospital Regional de Ayacucho",
  "consultorio": "Consultorio 3",
  "medico": "Dra. Ana Torres",
  "fechaHora": "2026-11-05T08:20:00-05:00",
  "qr": "data:image/png;base64,iVBORw0…",
  "notificacion": "ENVIADA"
}
```

| Error | HTTP | `codigo` |
| :--- | :--- | :--- |
| Falta `cupoId` | 400 | `DATOS_INVALIDOS` |
| Cupo inexistente | 404 | `CUPO_NO_EXISTE` |
| Cupo ocupado (RN-01, RN-11) | 409 | `CUPO_NO_DISPONIBLE` |
| Cupo vencido (RN-09) | 409 | `CUPO_VENCIDO` |
| Ya tiene cita en esa especialidad ese día (RN-02) | 409 | `CITA_DUPLICADA` |
| Ya tiene 3 citas reservadas (RN-10) | 409 | `LIMITE_CITAS` |
| DNI con restricción | 409 | `IDENTIDAD_NO_VALIDA` |
| RENIEC no responde (RN-14) | 503 | `SERVICIO_IDENTIDAD_NO_DISPONIBLE` |

### 4.2 Otros endpoints

| Endpoint | Uso | Respuesta |
| :--- | :--- | :--- |
| `GET /api/v1/citas/mias?estado=RESERVADA` | Mis citas (próximas primero) | `200 [ { citaId, codigo, especialidad, establecimiento, fechaHora, estado } ]` |
| `GET /api/v1/citas/{citaId}` | Ver la ficha | `200` igual a la respuesta de reserva · `404` si no es del paciente |
| `GET /api/v1/citas/{citaId}/ficha.pdf` | Descargar la ficha (RF03) | `200 application/pdf` |
| `PATCH /api/v1/citas/{citaId}/cancelar` | Cancelar (Debería) | `200` · `409 CITA_ATENDIDA` · `409 FUERA_DE_PLAZO` |

### 4.3 SMS enviado

`Hampi: cita HAMPI-1A2B3C4D, Pediatria, H. Regional Ayacucho, 05/11 08:20, Cons. 3. Llega 20 min antes con tu DNI.` (máx. 160 caracteres, sin tildes para compatibilidad).

## 5. Pantallas (Sprint 3)

1. **Reservar cita:** pasos *Especialidad → Establecimiento → Fecha y hora → Confirmar*, con indicador de progreso.
2. **Confirmar:** resumen de la cita y botón **Confirmar reserva**.
3. **Ficha:** código QR grande, datos de la cita, botones **Descargar PDF** y **Volver al portal**, aviso "Te enviamos un SMS".
4. **Mis citas:** lista de próximas y pasadas, con acceso a la ficha.

## 6. Criterios de aceptación

| ID | Dado | Cuando | Entonces |
| :--- | :--- | :--- | :--- |
| CA-005-1 | María (70000001) con sesión y el cupo `c-0012` disponible | reserva `c-0012` | recibe 201 con código `HAMPI-…`, QR y estado `RESERVADA`; el cupo pasa a `OCUPADO` |
| CA-005-2 | la reserva anterior se hizo | se revisa el simulador SMS | hay un mensaje para el celular de María con el código de la cita |
| CA-005-3 | María ya reservó Pediatría el 05/11 | intenta otro cupo de Pediatría el 05/11 | responde 409 `CITA_DUPLICADA` y el cupo sigue libre |
| CA-005-4 | el cupo `c-0012` está ocupado | José intenta reservarlo | responde 409 `CUPO_NO_DISPONIBLE` |
| CA-005-5 | María y José piden `c-0013` al mismo tiempo | ambas peticiones llegan | una recibe 201 y la otra 409; en BD el cupo tiene una sola cita (RN-11) |
| CA-005-6 | María tiene 3 citas reservadas | intenta una cuarta | responde 409 `LIMITE_CITAS` |
| CA-005-7 | el simulador SMS está caído | María reserva | recibe 201 con `notificacion: "PENDIENTE"`; la cita queda guardada (RN-13) |
| CA-005-8 | el simulador PIDE está caído | María reserva | responde 503 y el cupo sigue libre (RN-14) |
| CA-005-9 | María tiene citas | abre *Mis citas* | ve sus citas y no las de otros pacientes |
| CA-005-10 | José conoce el `citaId` de María | pide `GET /api/v1/citas/{citaId}` | responde 404 |
| CA-005-11 | se decodifica el QR de la ficha | se lee su contenido | solo contiene `HAMPI-1A2B3C4D` (RN-12) |
| CA-005-12 | María tiene una cita en 5 horas | la cancela | queda `CANCELADA` y el cupo vuelve a `DISPONIBLE` (Debería) |
