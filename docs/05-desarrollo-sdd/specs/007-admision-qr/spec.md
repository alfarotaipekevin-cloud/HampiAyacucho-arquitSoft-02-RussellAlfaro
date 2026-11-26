# Spec 007 · Admisión con QR (recepción)

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HU14 (admisión del paciente con la ficha QR) · RF03 (uso de la ficha para el ingreso) · RN-04, RN-12 |
| **Módulo** | `citas` (API) y web Angular (`/admision`) |
| **Rol** | `PERSONAL_SALUD` (recepcionista o admisión de cada piso) |
| **Estado** | Implementada |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 4 del equipo = **Sprint 2 del curso** |

---

## 1. Contexto

Hasta la spec 005 el paciente recibe una ficha con QR, pero nadie la usaba: no existía la pantalla del establecimiento. En el hospital, **cada piso tiene su recepción y atiende ciertos servicios**, así que la recepcionista primero elige su servicio y recién ve las citas reservadas de hoy. Al llegar el paciente, lee el QR, compara el DNI físico con el que muestra el sistema y registra la llegada. Después, la cita se marca como atendida.

## 2. Alcance

**Incluye:**
- Elegir el servicio (especialidad) entre los que atiende el establecimiento del personal; la web lo recuerda en ese equipo.
- Agenda de **hoy** de ese servicio, con resumen (por llegar, en espera, atendidas, no llegaron) y filtros.
- Lectura del código de la ficha de tres formas: **cámara** del celular, tablet o webcam (jsQR en el navegador), **pistola lectora USB** (escribe el código y pulsa Enter) o **a mano**.
- Registrar la llegada y marcar la cita como atendida.

**No incluye:** pasar automáticamente a `NO_ASISTIO` al cierre del día (la agenda ya las muestra como "No llegó"), cola con llamado por pantalla, reprogramar una cita vencida, triaje.

## 3. Reglas

| ID | Regla |
| :--- | :--- |
| RA-01 | El personal solo admite citas **de su establecimiento**. El establecimiento sale de su cuenta (tabla `personal_establecimiento`), nunca de la petición. Una cita de otro establecimiento responde 404 al intentar admitirla y, al leer su QR, no muestra el nombre ni el DNI del paciente. |
| RA-02 | Solo se registra la llegada de citas **de hoy** (día en Lima). |
| RA-03 | La cita debe estar `RESERVADA` y sin llegada registrada (no cancelada, no atendida, sin doble registro). |
| RA-04 | La llegada se acepta hasta **20 minutos después** de la hora de la cita (tolerancia). Pasado ese tiempo, la agenda la muestra como "No llegó". Se puede llegar antes. |
| RA-05 | Una cita se marca `ATENDIDA` solo si antes se registró la llegada (completa RN-04). |
| RN-12 | El QR lleva solo el código `HAMPI-XXXXXXXX`; los datos del paciente se consultan en la API con sesión de personal. |

## 4. Contrato (OpenAPI: etiqueta *Admisión*)

| Método | Ruta | Descripción | Errores |
| :--- | :--- | :--- | :--- |
| GET | `/citas/admision/servicios` | Establecimiento del personal y servicios que atiende | 403 `SIN_ESTABLECIMIENTO` |
| GET | `/citas/admision/agenda?especialidadId=` | Citas de hoy del servicio, con resumen | 400 `ESPECIALIDAD_REQUERIDA`, 404 `SERVICIO_NO_EXISTE` |
| GET | `/citas/admision/codigo/{codigo}` | Cita leída del QR, `puedeRegistrarLlegada` y `motivo` | 400 `CODIGO_INVALIDO`, 404 `CITA_NO_EXISTE` |
| POST | `/citas/admision/{citaId}/llegada` | Registrar la llegada | 404, 409 `CITA_NO_RESERVADA` · `LLEGADA_YA_REGISTRADA` · `CITA_DE_OTRO_DIA` · `FUERA_DE_TOLERANCIA` |
| POST | `/citas/admision/{citaId}/atencion` | Marcar atendida | 404, 409 `SIN_LLEGADA` · `CITA_NO_RESERVADA` |

Todas exigen JWT con rol `PERSONAL_SALUD` (los demás roles reciben 403, comprobado por EQ-04).

## 5. Criterios de aceptación

| ID | Dado / Cuando / Entonces | Prueba |
| :--- | :--- | :--- |
| CA-007-1 | Dado el personal del Hospital Regional, cuando pide sus servicios, entonces recibe solo las especialidades que atiende ese hospital. | `pruebas/api/admision.test.ts` |
| CA-007-2 | Dado un servicio vacío o que el establecimiento no atiende, cuando pide la agenda, entonces recibe 400 o 404. | ídem |
| CA-007-3 | Dada una cita de hoy y otra de mañana en Pediatría, cuando pide la agenda de Pediatría, entonces ve solo la de hoy, con el nombre y DNI del paciente y "por llegar". | ídem |
| CA-007-4 | Dado el código de una ficha (aunque venga en minúsculas), cuando lo busca, entonces ve la cita y `puedeRegistrarLlegada = true`. | ídem + `web/e2e/admision.spec.ts` |
| CA-007-5 | Dado el personal de Huanta, cuando lee el QR de una cita del Regional, entonces no ve el nombre ni el DNI y no puede registrar la llegada (RA-01). | ídem |
| CA-007-6 | Dada una cita de otro día, cuando intenta registrar la llegada, entonces recibe 409 `CITA_DE_OTRO_DIA` (RA-02). | ídem + e2e |
| CA-007-7 | Dada una cita de hoy, cuando registra la llegada y luego la atención, entonces pasa a "en espera" y luego a `ATENDIDA`, y el paciente la ve atendida; un segundo registro da `LLEGADA_YA_REGISTRADA` y atender sin llegada da `SIN_LLEGADA`. | ídem + e2e |
| CA-007-8 | Dada una cita de las 10:20, cuando son las 10:41, entonces la agenda la muestra como "No llegó" y la llegada se rechaza con `FUERA_DE_TOLERANCIA` (RA-04). | ídem |
| CA-007-9 | Dado un paciente, cuando entra a `/admision`, entonces la web lo devuelve al portal; y el portal del personal muestra "Admisión de citas" en lugar de "Citas". | API + e2e |

## 6. Plan técnico

- **Dominio** (`cita.ts`): `registrarLlegada(ahora, establecimiento)` y `atender(establecimiento)` con RA-01 a RA-05; nuevo dato `llegadaEn`.
- **Puertos** (`repositorios.ts`): `RepositorioCitas.buscarPorCodigo` y `delDia`, `RepositorioCatalogo.especialidadesDelEstablecimiento`, nuevo `RepositorioPersonal` (P3: Citas identifica al personal por DNI y no lee la tabla `usuarios`).
- **Caso de uso** `AdmisionUseCase`; rutas en `citas.routes.ts` antes de `/:citaId`.
- **Migración** `003_admision.sql`: columna `citas.llegada_en`, tabla `personal_establecimiento`, índice `citas_agenda (dia_lima, especialidad_id)`.
- **Datos demo**: 70000099 → Hospital Regional; 70000096 → Hospital de Huanta (contraseña `Hampi2026`).
- **Web**: ruta `/admision` con `personalGuard`, componente `LectorQr` (getUserMedia + jsQR cargado solo al abrir la cámara), agenda que se refresca cada 30 s, diseño responsivo.

## 7. Extensión · Pantalla de sala de espera (televisor)

- **Ruta web:** `/sala-espera?servicio=ped`, con `personalGuard`. La recepción la abre desde Admisión con el botón "📺 Pantalla de sala de espera", en una pestaña aparte que se lleva al televisor.
- **Contenido:**
  - "Pasa a consulta": el primer paciente en espera, en el orden de su cita, con su consultorio y médico;
  - los siguientes que ya llegaron;
  - las próximas citas por llegar.
- **Actualización:** se renueva sola cada 15 s con la misma agenda de la API; no hay ruta nueva.
- **Diseño:** colores claros para que se lea a distancia en un televisor.
- **Privacidad:**
  - solo se ve el nombre y las iniciales de los apellidos (`nombrePublico`: "Rosa A. P.");
  - nunca se muestra el DNI;
  - del código solo se muestran los 4 últimos caracteres.
- **Limitación:** usa la sesión del personal, que dura 30 minutos (JWT). En una exposición conviene volver a abrirla antes de mostrarla.
- **Accesibilidad:** auditada con axe (EQ-05), con 0 errores.

