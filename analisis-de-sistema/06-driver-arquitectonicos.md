# 06. Drivers Arquitectónicos - Hampi Ayacucho

| ID | Driver Arquitectónico | Origen | Impacto en la Arquitectura |
| :--- | :--- | :--- | :--- |
| **DA01** | **Alta concurrencia en picos de demanda** | AC01, AC03 | Obliga a usar caché en memoria (Redis) y lógica sin estado para permitir autoescalamiento horizontal. |
| **DA02** | **Confidencialidad y auditoría médica** | AC04, RC06 | Exige autenticación con 2FA, roles RBAC y registro inmutable de auditoría para cada consulta a historias clínicas. |
| **DA03** | **Enfoque 100% Web con API REST** | RC01, RC03 | Requiere desacoplar el cliente web de los servicios backend mediante endpoints normalizados. |
| **DA04** | **Interoperabilidad con RENHICE y PIDE** | RC04, RC05 | Determina el diseño de adaptadores en la capa de negocio para comunicarse con servicios gubernamentales externos. |
| **DA05** | **Alta disponibilidad del servicio (99.9%)** | AC02 | Exige separar lecturas y escrituras en base de datos para no bloquear el registro de citas críticas. |
