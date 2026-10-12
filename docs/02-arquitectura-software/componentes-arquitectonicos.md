# Componentes Arquitectónicos - Hampi Ayacucho

Se utiliza el estilo arquitectónico **monolito modular en capas**: un solo contenedor de backend (API Hampi) dividido en módulos de negocio, cada uno organizado internamente con Clean Architecture.

![Componentes arquitectónicos de la API Hampi](../../img/nivel3-componentes.png)

> Fuente editable: `img/fuentes/nivel3-componentes.mmd` · Corresponde al **nivel 3 del modelo C4** (`docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md`).

## 1. Componentes y su origen

Cada componente nace de un requisito, una historia de usuario o un driver. Esta trazabilidad permite responder **de qué requisito sale cualquier componente del diagrama**.

| Componente | Responsabilidad | Historias de usuario | Requisitos | Drivers / restricciones |
| :--- | :--- | :--- | :--- | :--- |
| **API REST** | Punto de entrada HTTP: rutas `/api/v1`, JWT + 2FA, RBAC, validación y manejo de errores | Todas | Todos | DA03, RC03, DA02 |
| **Usuarios** | Registro, inicio de sesión, segundo factor, roles; valida el DNI con la PIDE | HU02, HU08 | RF02, RF09 | DA02, DA04, RC04 |
| **Citas** | Cupos por especialidad y establecimiento, reserva, cancelación y ficha QR | HU01, HU02 | RF01, RF02, RF03 | DA01 (caché), DA05 |
| **Historia Clínica (HCE)** | Registro y consulta de atenciones, diagnósticos y tratamientos; intercambio con el RENHICE | HU03 | RF04 | DA02, DA04, RC05 |
| **Referencias** | Emisión de referencias, admisión en el establecimiento receptor y contrarreferencia | HU04, HU05 | RF05, RF06 | DA06 |
| **Reportes** | Dashboard de ocupación y colas, indicadores en formato MINSA | HU06, HU07 | RF07, RF08 | DA05 (réplica de lectura) |
| **Notificaciones** | Avisos al paciente por SMS y correo (cita reservada, cancelada, referencia aceptada) | HU02, HU05 | RF03, RF06 | DA04 |
| **Auditoría** | Bitácora inmutable de cada acceso a datos clínicos | HU08 | RF09 | DA02, RC06 |

## 2. Relaciones entre componentes

| Origen | Destino | Descripción | Tipo de comunicación |
| :--- | :--- | :--- | :--- |
| Aplicación web | API REST | Llama a la API | HTTPS/JSON |
| API REST | Módulos de negocio | Invoca los casos de uso | Llamada en memoria |
| Citas | Usuarios | Valida que el paciente exista y tenga DNI verificado | Llamada en memoria (API pública del módulo) |
| Referencias | Historia Clínica | Adjunta los antecedentes clínicos a la referencia | Llamada en memoria |
| Referencias | Citas | Programa el turno del paciente referido | Llamada en memoria |
| Citas, Referencias | Notificaciones | Publican el cambio de estado | Evento en memoria |
| Historia Clínica | Auditoría | Registra cada acceso a la HCE | Evento en memoria |

## 3. Relaciones con contenedores y sistemas externos

| Componente | Destino | Descripción | Protocolo | Patrón aplicado |
| :--- | :--- | :--- | :--- | :--- |
| Todos los módulos | Base de datos principal (PostgreSQL) | Cada módulo lee y escribe solo sus propias tablas | SQL | Repository |
| Reportes | Réplica de lectura (PostgreSQL) | Consultas pesadas sin bloquear el registro de citas | SQL | Repository |
| Citas | Caché (Redis) | Guarda y lee los cupos disponibles | TCP | Decorator |
| Usuarios | PIDE / RENIEC | Valida el DNI | HTTPS/REST | Adapter |
| Historia Clínica | RENHICE - MINSA | Sincroniza historias clínicas | HTTPS/REST | Adapter |
| Notificaciones | Servicio de mensajería | Envía SMS y correos | HTTPS/REST | Adapter |

## 4. Reglas del monolito modular

| # | Regla | Motivo |
| :--- | :--- | :--- |
| 1 | Todos los componentes se despliegan juntos en el contenedor API Hampi | Es un monolito: un solo proceso y un solo despliegue (ADR-001) |
| 2 | Un módulo usa a otro solo a través de su API pública (`index.ts`) | Un cambio interno en un módulo no rompe a los demás (DA06) |
| 3 | Un módulo no lee ni escribe las tablas de otro módulo | Mantiene la independencia de los datos de cada módulo |
| 4 | Cada sistema externo se integra en un único módulo | La integración queda en un solo lugar y es fácil de reemplazar (ADR-006) |
| 5 | Cada módulo se organiza por dentro con Clean Architecture | Las reglas sanitarias no dependen de la tecnología (ADR-002) |

> **Refinamiento respecto a la arquitectura inicial:** se agregan los módulos **Notificaciones** y **Auditoría**, que antes estaban implícitos dentro de Citas y Usuarios, para que cada uno tenga una sola responsabilidad.
