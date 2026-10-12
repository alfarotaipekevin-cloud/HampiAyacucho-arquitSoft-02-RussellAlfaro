# Estilo Arquitectónico - Hampi Ayacucho

## 1. Estilo seleccionado
**Monolito modular + arquitectura en capas.**

- **Monolito:** el backend es **una sola aplicación** que se ejecuta en un solo proceso y se despliega como una unidad (unidad de despliegue).
- **Modular:** internamente se divide en **módulos por dominio** (Usuarios, Citas, HCE, Referencias y Reportes) con límites claros.
- **En capas:** cada módulo se organiza en **Presentación → Lógica de negocio → Datos** (organización lógica).

> Capas = organización lógica. Monolito = unidad de despliegue. Ambos conceptos coexisten.

## 2. Estilos evaluados

| Estilo | ¿Por qué sí / por qué no? | Decisión |
| :--- | :--- | :--- |
| Monolito tradicional | Simple, pero mezcla responsabilidades y dificulta incorporar cambios normativos (DA06). | Descartado |
| **Monolito modular en capas** | Simple de desplegar y operar para la GERESA, con módulos separados que pueden escalar horizontalmente (DA01) y evolucionar (DA06). | **Seleccionado** |
| Microservicios | Escala por servicio, pero exige equipos, infraestructura y monitoreo que la GERESA aún no tiene. | Descartado (posible evolución futura) |
| Event-Driven | Útil para notificaciones, pero agrega complejidad innecesaria para el núcleo del sistema. | Descartado como estilo global |

## 3. Justificación con los drivers

| Driver | Cómo lo responde el estilo |
| :--- | :--- |
| DA01 - Escalabilidad | El monolito es sin estado: se ejecutan varias instancias detrás de un balanceador; la caché Redis se comparte. |
| DA03 - API REST | El cliente web se separa del backend y se comunica solo por HTTPS/JSON. |
| DA04 - Integración externa | Los servicios externos se invocan solo desde la capa de negocio mediante adaptadores. |
| DA05 - Disponibilidad | Varias instancias + réplica de lectura de la base de datos. |
| DA06 - Mantenibilidad | Cada módulo se modifica sin afectar a los demás; se comunican solo a través de su servicio. |

## 4. Diagrama de arquitectura

```mermaid
flowchart TB
    subgraph ACT["Actores"]
        direction LR
        P["Paciente"]
        PS["Personal de Salud"]
        EG["Especialista GERESA"]
        AD["Administrador"]
    end

    WEB["Cliente Web<br/>(Angular · navegador)"]
    ACT --> WEB
    WEB -- "HTTPS · JSON /api/v1" --> MW

    subgraph MONO["«monolito» Hampi Ayacucho Backend · Node.js + Express · un solo despliegue"]
        MW["Middlewares transversales<br/>cors · auth JWT + 2FA · RBAC · validación · auditoría · logger"]

        subgraph PRES["1. Capa de Presentación"]
            direction LR
            UC["usuarios.controller"]
            CC["citas.controller"]
            HC["hce.controller"]
            RC["referencias.controller"]
            RPC["reportes.controller"]
        end

        subgraph NEG["2. Capa de Lógica de Negocio"]
            direction LR
            US["usuarios.service<br/>registro · login · 2FA"]
            CS["citas.service<br/>cupos · reserva · QR"]
            HS["hce.service<br/>atenciones · diagnósticos"]
            RS["referencias.service<br/>derivación · contrarreferencia"]
            RPS["reportes.service<br/>indicadores MINSA"]
        end

        subgraph DAT["3. Capa de Datos"]
            direction LR
            UR["usuarios.repository"]
            CR["citas.repository"]
            HR["hce.repository"]
            RR["referencias.repository"]
            RPR["reportes.repository"]
        end

        ORM["Acceso a datos compartido · ORM · pool de conexiones"]

        MW --> PRES
        UC --> US --> UR
        CC --> CS --> CR
        HC --> HS --> HR
        RC --> RS --> RR
        RPC --> RPS --> RPR
        RS -. "usa servicio" .-> HS
        RS -. "usa servicio" .-> CS
        DAT --> ORM
    end

    DB[("PostgreSQL<br/>principal (escritura)")]
    DBR[("PostgreSQL<br/>réplica (lectura)")]
    CACHE[("Redis<br/>caché de cupos")]

    ORM -- "SQL" --> DB
    DB -. "replicación" .-> DBR
    RPR -- "consultas" --> DBR
    CS --> CACHE

    PIDE["«externo» PIDE / RENIEC<br/>validación DNI"]
    REN["«externo» RENHICE / MINSA<br/>historias clínicas"]
    MSG["«externo» Mensajería<br/>SMS · correo"]

    US -- "HTTPS / REST" --> PIDE
    HS -- "HTTPS / REST" --> REN
    CS -- "HTTPS / REST" --> MSG
```

## 5. Reglas de la arquitectura
1. Cada capa solo invoca a la capa inmediatamente inferior (Controller → Service → Repository).
2. Un módulo **no** accede al repository ni a las tablas de otro módulo; se comunica llamando a su **service**.
3. Los sistemas externos solo se invocan desde la capa de lógica de negocio.
4. Todo se ejecuta en un único proceso Node.js; la escalabilidad se logra con varias instancias idénticas detrás de un balanceador.
5. Los reportes de la GERESA leen de la réplica para no bloquear el registro de citas.
