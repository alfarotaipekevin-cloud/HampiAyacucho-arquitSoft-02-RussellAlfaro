# 06. Drivers Arquitectónicos - Hampi Ayacucho

| ID | Driver Arquitectónico | Origen | Impacto en la Arquitectura |
| :--- | :--- | :--- | :--- |
| **DA01** | **Alta concurrencia en picos de demanda** | AC01, AC03 | Obliga a usar caché en memoria (Redis) y lógica sin estado para permitir autoescalamiento horizontal. |
| **DA02** | **Confidencialidad y auditoría médica** | AC04, RC06 | Exige autenticación con 2FA, roles RBAC y registro inmutable de auditoría para cada consulta a historias clínicas. |
| **DA03** | **Enfoque 100% Web con API REST** | RC01, RC03 | Requiere desacoplar el cliente web de los servicios backend mediante endpoints normalizados. |
| **DA04** | **Interoperabilidad con RENHICE y PIDE** | RC04, RC05 | Determina el diseño de adaptadores en la capa de negocio para comunicarse con servicios gubernamentales externos. |
| **DA05** | **Alta disponibilidad del servicio (99.9%)** | AC02 | Exige separar lecturas y escrituras en base de datos para no bloquear el registro de citas críticas. |
| **DA06** | **Mantenibilidad / evolución modular** | AC06 | El sistema debe permitir modificar funcionalidades (por ejemplo, nuevas normas del MINSA) sin afectar innecesariamente otros módulos. Influye en la separación de responsabilidades, la modularidad y las dependencias internas. |

## Drivers priorizados: problema y decisión que responde

| Driver | Problema que plantea | Decisión que responde |
| :--- | :--- | :--- |
| **DA01 - Escalabilidad / Rendimiento** | Picos de hasta 15,000 usuarios al abrirse los cupos de citas o en campañas de salud. | Monolito modular sin estado con posibilidad de escalamiento horizontal + caché Redis para la disponibilidad de citas. |
| **DA02 - Seguridad** | Las historias clínicas son datos sensibles protegidos por ley. | Autenticación JWT con 2FA, autorización por roles (RBAC) y bitácora de auditoría. |
| **DA03 - API REST** | El cliente web y el backend deben comunicarse de forma estándar. | Separar la interfaz web del backend mediante una API REST versionada (`/api/v1`). |
| **DA04 - Integración externa** | Hay que comunicarse con PIDE (RENIEC), RENHICE (MINSA) y el servicio de mensajería. | Integración mediante interfaces (puertos) y adaptadores que aíslan a cada servicio externo. |
| **DA05 - Disponibilidad** | Una caída o bloqueo impediría registrar citas y atenciones. | Réplica de lectura de la base de datos y múltiples instancias detrás de un balanceador. |
| **DA06 - Mantenibilidad** | Los cambios normativos no deben afectar a otros módulos. | Modularidad por dominio + Clean Architecture dentro de cada módulo. |
