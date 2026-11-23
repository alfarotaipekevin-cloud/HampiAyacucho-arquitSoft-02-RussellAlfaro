# Decisiones Arquitectónicas (ADR) - Hampi Ayacucho

Un **ADR (Architecture Decision Record)** documenta una decisión importante del diseño, el driver que la origina y su justificación.

## 1. Resumen de decisiones

| ID | Decisión arquitectónica | Driver relacionado | Justificación | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Monolito modular | DA01 - Escalabilidad; DA06 - Mantenibilidad | Organizar las funcionalidades en módulos independientes dentro de una misma aplicación desplegable, más simple de operar para la GERESA que microservicios. | Módulos de Usuarios, Citas, HCE, Referencias y Reportes. |
| **ADR-002** | Clean Architecture dentro de cada módulo | DA06 - Mantenibilidad | Separar las reglas sanitarias (dominio) de los detalles tecnológicos (framework, BD, servicios del Estado). | Capas de Dominio, Aplicación, Adaptadores e Infraestructura. |
| **ADR-003** | API REST versionada | DA03 - API REST | Desacoplar el cliente web del backend con un contrato estándar. | Endpoints `/api/v1/...` en formato JSON. |
| **ADR-004** | Estrategia de caché | DA01 - Rendimiento | Reducir consultas repetitivas a la base de datos en la búsqueda de disponibilidad de citas. | Caché Redis para cupos y horarios de consulta frecuente. |
| **ADR-005** | Autenticación 2FA, RBAC y auditoría | DA02 - Seguridad | Proteger los datos de salud conforme a la Ley 29733 y la Ley 26842. | JWT + segundo factor, roles por actor y bitácora de accesos a la HCE. |
| **ADR-006** | Integración con PIDE, RENHICE y mensajería mediante interfaces y adaptadores | DA04 - Integración externa | Desacoplar los casos de uso de los servicios del Estado, que pueden cambiar de versión o caerse. | Contratos (puertos) en el dominio y adaptadores en infraestructura. |
| **ADR-007** | Réplica de lectura y múltiples instancias | DA05 - Disponibilidad | Evitar que reportes y consultas bloqueen el registro de citas. | Base de datos principal para escritura, réplica para lectura y balanceador de carga. |
| **ADR-008** | Simuladores de servicios externos y entorno con Docker Compose | DA04 - Integración externa | Sin acceso a la PIDE ni a un proveedor de SMS en un proyecto académico; todo el equipo necesita el mismo entorno. | Servicios `mock-pide-reniec` y `mock-sms` en contenedores, junto a PostgreSQL. |
| **ADR-009** | Despliegue en la nube con planes gratuitos | DA05 - Disponibilidad | Presentar el sistema desde una URL pública con HTTPS sin costo. | Vercel (web) · Render (API y simuladores, `render.yaml`) · Neon (PostgreSQL). |

---

## 2. Detalle de las decisiones principales

### ADR-001: Monolito modular
- **Contexto:** La GERESA cuenta con un equipo técnico reducido y presupuesto limitado, pero el sistema debe soportar picos de 15,000 usuarios y evolucionar con nuevas normas.
- **Alternativas evaluadas:** monolito tradicional, microservicios, monolito modular.
- **Decisión:** Monolito modular: una sola aplicación desplegable dividida en módulos por dominio con límites claros.
- **Consecuencias:** (+) Despliegue y operación simples; los módulos pueden extraerse como servicios en el futuro. (−) Todos los módulos escalan juntos; requiere disciplina para no acoplar módulos entre sí.

### ADR-002: Clean Architecture
- **Contexto:** Las reglas sanitarias (validez de una cita, requisitos de una referencia) deben mantenerse aunque cambie la base de datos o la versión de los servicios del MINSA.
- **Alternativas evaluadas:** capas tradicionales (controller → service → repository), arquitectura hexagonal, Clean Architecture.
- **Decisión:** Clean Architecture con la regla de dependencias hacia adentro.
- **Consecuencias:** (+) Dominio testeable sin base de datos ni frameworks; tecnologías intercambiables. (−) Más archivos e interfaces; curva de aprendizaje para el equipo.

### ADR-004: Estrategia de caché
- **Contexto:** Al abrirse los cupos, miles de pacientes consultan la disponibilidad al mismo tiempo (AC01: respuesta < 2 s).
- **Alternativas evaluadas:** consultar siempre a la base de datos, caché local en memoria, caché distribuida Redis.
- **Decisión:** Caché distribuida Redis compartida por todas las instancias.
- **Consecuencias:** (+) Menor carga en la base de datos y respuestas rápidas. (−) Se debe invalidar la caché al reservar o cancelar una cita.

### ADR-006: Integración mediante interfaces y adaptadores
- **Contexto:** PIDE y RENHICE son servicios externos del Estado con sus propios formatos, credenciales y disponibilidad.
- **Alternativas evaluadas:** llamar a los servicios directamente desde los casos de uso, usar puertos y adaptadores.
- **Decisión:** Definir contratos (`ValidadorIdentidad`, `RepositorioNacionalHCE`, `Notificador`) en el dominio e implementarlos con adaptadores en infraestructura.
- **Consecuencias:** (+) Se pueden usar adaptadores simulados en pruebas y cambiar de proveedor sin tocar el dominio. (−) Una capa adicional de traducción de datos.

### ADR-008: Simuladores de servicios externos y Docker Compose
- **Contexto:** Un proyecto académico no tiene credenciales de la PIDE ni contrato con un proveedor de SMS, pero el flujo de reserva depende de ambos (RC04).
- **Alternativas evaluadas:** adaptadores en memoria dentro del backend (como el boilerplate), servicios simulados aparte, sandbox de un proveedor comercial.
- **Decisión:** Servicios simulados aparte, con el mismo estilo de contrato que el real, levantados con Docker Compose junto a PostgreSQL. Los adaptadores en memoria se mantienen para las pruebas unitarias.
- **Consecuencias:** (+) El backend usa HTTP real hacia los servicios externos y se pueden probar fallas (503) y latencia; pasar al servicio real solo cambia la URL y el adaptador. (−) Dos servicios más que mantener; el contrato simulado puede diferir del real (p. ej. SOAP de la PIDE).

### ADR-009: Despliegue en la nube con planes gratuitos
- **Contexto:** El sistema debe presentarse desde una URL pública con HTTPS y el proyecto no tiene presupuesto.
- **Alternativas evaluadas:** (A) Vercel + Render + Neon, (B) Railway, (C) VPS con Docker Compose. Ver `docs/06-scrum/00-roadmap-y-despliegue.md`.
- **Decisión:** Opción A, aprobada por el Product Owner el 2026-10-23.
- **Consecuencias:** (+) Costo cero, HTTPS automático y despliegue al hacer push. (−) El plan gratuito de Render suspende el servicio inactivo y la primera petición tarda unos 30 a 60 s.
- **Estado:** aprobado. Configuración en `render.yaml` y pasos en `docs/06-scrum/03-guia-de-despliegue.md`.
