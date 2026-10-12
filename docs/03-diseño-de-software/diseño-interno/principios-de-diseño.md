# Principios de diseño (SOLID)

## Objetivo

Documentar cómo se aplican los principios SOLID en el backend de Hampi Ayacucho, organizado con Clean Architecture, para que cada módulo se programe de forma uniforme y las reglas sanitarias no dependan de la tecnología.

## Contexto

- **Estilo:** monolito modular (Node.js + Express + TypeScript).
- **Enfoque interno:** Clean Architecture (presentación, aplicación, dominio, infraestructura).
- **Módulo de referencia:** Citas, porque integra base de datos, caché, PIDE y servicio de mensajería.

## SOLID en el módulo Citas

| Principio | Dónde se aplica (capa) | Cómo se cumple en Hampi Ayacucho | Archivos |
| :--- | :--- | :--- | :--- |
| **S** · Responsabilidad única | Todas las capas | Cada clase tiene una sola tarea: el controlador recibe la petición HTTP, el caso de uso coordina la reserva, la entidad `Cita` aplica las reglas y el repositorio guarda en PostgreSQL | `citas.controller.ts`, `reservar-cita.use-case.ts`, `cita.ts`, `citas-postgres.repository.ts` |
| **O** · Abierto/cerrado | Infraestructura | Para enviar notificaciones por WhatsApp se crea un nuevo adaptador de `Notificador`; el caso de uso no se modifica | `sms-notificador.adapter.ts`, `whatsapp-notificador.adapter.ts` |
| **L** · Sustitución de Liskov | Infraestructura | `PideAdapter` y `PideSimuladoAdapter` cumplen el mismo contrato `validar(dni): boolean`; el caso de uso funciona igual con cualquiera (así se prueba sin la PIDE) | `pide.adapter.ts`, `pide-simulado.adapter.ts` |
| **I** · Segregación de interfaces | Dominio | Cada puerto tiene solo lo que Citas necesita: `ValidadorIdentidad` solo valida, `Notificador` solo avisa, `RepositorioCupos` solo busca y guarda cupos | `validador-identidad.ts`, `notificador.ts`, `repositorio-cupos.ts` |
| **D** · Inversión de dependencias | Aplicación | El caso de uso recibe interfaces por el constructor y no conoce PostgreSQL, Redis, la PIDE ni el proveedor de SMS; las implementaciones se conectan en `citas.module.ts` | `reservar-cita.use-case.ts`, `citas.module.ts` |

## Qué pasaría sin SOLID en Hampi Ayacucho

| Situación real | Sin SOLID | Con SOLID |
| :--- | :--- | :--- |
| La PIDE cambia la versión de su servicio | Se modifica el caso de uso de reserva | Solo se actualiza `PideAdapter` |
| El MINSA cambia el formato del RENHICE | Se modifica el código del módulo HCE en varios lugares | Solo se reemplaza `RenhiceAdapter` (EQ-06) |
| Se quiere probar la reserva de citas | Se necesita PostgreSQL, Redis y acceso a la PIDE | Se prueba con implementaciones en memoria (`npm test`) |
| Cambia una regla de reserva (por ejemplo, máximo de citas por día) | Hay que buscarla en controladores y servicios | Está solo en la entidad `Cita` |
| Se agrega WhatsApp como canal | Se modifica cada lugar que envía SMS | Se crea un adaptador nuevo y se conecta en la composición |

## Relación con Clean Architecture y los patrones

| Principio | Lo cumple en el proyecto |
| :--- | :--- |
| Responsabilidad única | La separación en capas de Clean Architecture y en módulos del monolito |
| Abierto/cerrado y Liskov | El patrón Adapter (PIDE, RENHICE, mensajería) |
| Segregación de interfaces | Los puertos pequeños del dominio |
| Inversión de dependencias | El patrón Repository y la regla de dependencia: las capas externas dependen del dominio |
