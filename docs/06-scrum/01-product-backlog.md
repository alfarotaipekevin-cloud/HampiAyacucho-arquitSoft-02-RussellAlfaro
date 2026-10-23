# 01. Product Backlog - Hampi Ayacucho (módulo de citas)

> **Product Owner:** Russell Kevin Alfaro Taipe · **Versión:** 1.0 · Sprint 0
> **Priorización:** MoSCoW (M = debe, S = debería, C = podría, W = no por ahora) · **Estimación:** puntos de historia (Fibonacci).

Las historias HU01–HU08 vienen de `docs/01-analisis-de-sistema/02-historias-del-usuario.md`. Las nuevas (HU09–HU13) nacen de la decisión de entrar por un login y un portal. Las HT son historias técnicas.

---

## 1. Historias nuevas

| ID | Historia de usuario |
| :--- | :--- |
| **HU09** | Como **paciente**, quiero crear una cuenta validando mi DNI, para acceder al portal de Hampi de forma segura. |
| **HU10** | Como **usuario**, quiero iniciar sesión con mi número de documento y contraseña, para usar los servicios que me corresponden. |
| **HU11** | Como **usuario**, quiero recuperar mi contraseña con un código enviado a mi celular, para no perder el acceso a mi cuenta. |
| **HU12** | Como **usuario**, quiero ver un portal con los servicios disponibles para mi rol, para elegir a dónde ir. |
| **HU13** | Como **paciente**, quiero ver mis citas reservadas y su ficha QR, para recordarlas y presentarlas el día de la atención. |
| **HT01** | Como **equipo**, necesitamos un simulador de la PIDE/RENIEC, para probar la validación de identidad sin acceso al servicio real. |
| **HT02** | Como **equipo**, necesitamos un simulador del proveedor de SMS, para probar las notificaciones sin enviar mensajes reales. |
| **HT03** | Como **equipo**, necesitamos levantar todo el sistema con Docker Compose y validar cada PR con CI, para trabajar y demostrar sin configuraciones manuales. |
| **HT04** | Como **equipo**, necesitamos desplegar el sistema en la nube con HTTPS, para presentarlo desde una URL pública. |

---

## 2. Backlog priorizado

| Orden | ID | Título | Spec | RF | MoSCoW | Puntos | Sprint |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | HT01 | Simulador PIDE/RENIEC | [001](../05-desarrollo-sdd/specs/001-apis-simuladas/spec.md) | RF02 | M | 3 | 1 |
| 2 | HT02 | Simulador SMS | [001](../05-desarrollo-sdd/specs/001-apis-simuladas/spec.md) | RF03 | M | 2 | 1 |
| 3 | HT03 | Docker Compose + CI | [Roadmap](00-roadmap-y-despliegue.md) | — | M | 5 | 1 |
| 4 | HU09 | Crear cuenta con DNI | [002](../05-desarrollo-sdd/specs/002-identidad-acceso/spec.md) | RF02 | M | 5 | 2 |
| 5 | HU10 | Iniciar sesión y roles (JWT) | [002](../05-desarrollo-sdd/specs/002-identidad-acceso/spec.md) | RF09 (parcial) | M | 5 | 2 |
| 6 | HU01 | Consultar disponibilidad de citas | [004](../05-desarrollo-sdd/specs/004-consulta-disponibilidad/spec.md) | RF01 | M | 5 | 2 |
| 7 | HU02 | Reservar cita y recibir ficha QR | [005](../05-desarrollo-sdd/specs/005-reserva-cita/spec.md) | RF02, RF03 | M | 8 | 2 |
| 8 | HU12 | Portal de inicio por módulos | [003](../05-desarrollo-sdd/specs/003-portal-paciente/spec.md) | — | M | 3 | 2–3 |
| 9 | HU13 | Mis citas y descarga de ficha | [005](../05-desarrollo-sdd/specs/005-reserva-cita/spec.md) | RF03 | S | 3 | 3 |
| 10 | HU11 | Recuperar contraseña por SMS | [002](../05-desarrollo-sdd/specs/002-identidad-acceso/spec.md) | — | S | 3 | 3 |
| 11 | HT04 | Despliegue en la nube | [Roadmap](00-roadmap-y-despliegue.md) | — | S | 3 | 2–3 |
| 12 | HU02-b | Cancelar cita (RN-03, RN-15) | [005](../05-desarrollo-sdd/specs/005-reserva-cita/spec.md) | — | C | 2 | 3 |
| 13 | — | Caché Redis y prueba de carga EQ-01 | [004](../05-desarrollo-sdd/specs/004-consulta-disponibilidad/spec.md) | RF01 | C | 5 | 3 |
| — | HU03–HU08 | HCE, referencias, dashboard, reportes, auditoría | — | RF04–RF09 | W | — | Futuro |

**Total comprometido (M + S):** 45 puntos en 3 sprints de desarrollo.

---

## 3. Mapa de trazabilidad

| HU | RF | Spec | Criterios de aceptación |
| :--- | :--- | :--- | :--- |
| HU01 | RF01 | 004 | CA-004-1 … CA-004-7 |
| HU02 | RF02, RF03 | 005 | CA-005-1 … CA-005-11 |
| HU09 | RF02 | 002 | CA-002-1 … CA-002-5 |
| HU10 | RF09 (parcial) | 002 | CA-002-6 … CA-002-9, CA-002-12, CA-002-13 |
| HU11 | — | 002 | CA-002-10, CA-002-11 |
| HU12 | — | 003 | CA-003-1 … CA-003-5 |
| HU13 | RF03 | 005 | CA-005-9, CA-005-10 |
| HT01, HT02 | RF02, RF03 | 001 | CA-001-1 … CA-001-8 |
