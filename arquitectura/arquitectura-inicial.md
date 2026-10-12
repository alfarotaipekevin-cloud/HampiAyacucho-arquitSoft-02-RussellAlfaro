# Arquitectura Inicial del Sistema - Hampi Ayacucho

## 1. Organización en Tres Capas
- **Capa de Presentación:** Plataforma web unificada (Portal Pacientes y Paneles Clínicos/GERESA) comunicándose con los controladores de una API REST.
- **Capa de Lógica de Negocio:** Procesa las reglas mediante módulos de Usuarios (2FA), Citas y Turnos (QR), Historia Clínica Electrónica, Referencias y Reportes.
- **Capa de Datos:** Persistencia relacional junto con una capa de aceleración con caché en memoria.
- **Sistemas Externos:** Integración con RENHICE (MINSA), PIDE (RENIEC) y servicios de mensajería (SMS/Email).

---

## 2. Diagrama de Arquitectura

```mermaid
flowchart TD
subgraph ACTORES["ACTORES"]
    Paciente["Paciente"]
    PersonalSalud["Personal de Salud"]
    AdminGERESA["Especialista / Admin GERESA"]
end

subgraph PRESENTACION["CAPA DE PRESENTACIÓN"]
    Web["Plataforma Web (Portal y Paneles Clínicos)"]
    API["API REST Controllers"]
    Web --> API
end

subgraph NEGOCIO["CAPA DE LÓGICA DE NEGOCIO"]
    Usuarios["Módulo Usuarios & Autenticación"]
    Citas["Módulo Citas & Turnos (QR)"]
    HCE["Módulo Historia Clínica Electrónica"]
    Referencias["Módulo Referencias & Contrarreferencias"]
    Reportes["Módulo Indicadores & Reportes GERESA"]
end

subgraph DATOS["CAPA DE DATOS"]
    BD[("Base de Datos Relacional")]
    Cache[("Caché en Memoria")]
end

subgraph EXTERNOS["SISTEMAS EXTERNOS"]
    PIDE["PIDE / RENIEC (Validación DNI)"]
    RENHICE["RENHICE - MINSA (Historias Clínicas)"]
    Mensajeria["Servicio de Mensajería (SMS / Notificaciones)"]
end

ACTORES --> PRESENTACION
API --> NEGOCIO

Usuarios --> BD
Citas --> BD
Citas --> Cache
HCE --> BD
Referencias --> BD
Reportes --> BD

Usuarios -.-> PIDE
Citas -.-> Mensajeria
HCE -.-> RENHICE
Referencias -.-> RENHICE
```


## Descripción de la Arquitectura
La arquitectura inicial de **Hampi Ayacucho** se organiza en tres capas principales:

- **Presentación:** canaliza toda la interacción mediante la plataforma web unificada (portal ciudadano y paneles clínicos para el personal de salud) comunicándose a través de una API REST.
- **Lógica de Negocio:** concentra los módulos de procesamiento del dominio sanitario: Usuarios & Autenticación, Citas & Turnos (fichas digitales QR), Historia Clínica Electrónica (HCE), Referencias & Contrarreferencias e Indicadores para GERESA.
- **Datos:** garantiza la persistencia relacional íntegra de registros médicos mediante la base de datos principal, complementada con una capa de caché en memoria para optimizar la consulta de disponibilidad de citas.

Además, los módulos de la capa de negocio se integran de forma desacoplada con sistemas externos: la **PIDE (RENIEC)** para la verificación de identidad ciudadana, el **RENHICE (MINSA)** para la interoperabilidad de historias clínicas y el **servicio de mensajería** para notificaciones automáticas vía SMS y correo.