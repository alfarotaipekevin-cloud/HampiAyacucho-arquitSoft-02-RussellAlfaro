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
