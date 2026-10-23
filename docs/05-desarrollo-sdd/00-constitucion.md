# 00. Constitución del desarrollo (SDD) - Hampi Ayacucho

> **Alcance actual:** módulo de **reserva de citas** y el acceso al portal (Identidad).
> **Metodología:** Spec-Driven Development (SDD) dentro de sprints Scrum.
> **Versión:** 1.0 · Sprint 0

La constitución contiene las reglas que **todas** las especificaciones, planes y tareas deben respetar. Si una spec contradice este documento, se corrige la spec o se registra un ADR que justifique el cambio.

---

## 1. Cómo se aplica SDD en este proyecto

Cada funcionalidad avanza por cuatro artefactos, en este orden. No se escribe código de una funcionalidad sin que su spec esté en estado **Aprobada**.

| Paso | Artefacto | Pregunta que responde | Dónde vive |
| :--- | :--- | :--- | :--- |
| 1 | **Spec** (`spec.md`) | ¿**Qué** debe hacer y cómo se comprueba? (reglas, contrato de API, criterios de aceptación) | `docs/05-desarrollo-sdd/specs/<nnn>-<nombre>/` |
| 2 | **Plan técnico** (`plan.md`) | ¿**Cómo** se construye? (archivos por capa, dependencias, datos) | Misma carpeta; se escribe al iniciar el sprint que la implementa |
| 3 | **Tareas** | ¿En qué pasos pequeños se divide? | Sprint backlog del sprint (`docs/06-scrum/sprint-nn/`) |
| 4 | **Código + pruebas** | ¿Cumple la spec? | `tecnologia/` · cada criterio de aceptación tiene al menos una prueba |

```text
Historia de usuario (HU) ──► Spec ──► Plan ──► Tareas ──► Código + pruebas ──► Sprint Review
         ▲                                                                         │
         └─────────────── la retroalimentación actualiza la spec ◄─────────────────┘
```

**Trazabilidad obligatoria:** HU → RF → Spec → criterio de aceptación (CA) → prueba automatizada.

### Estados de una spec

`Borrador` → `En revisión` → `Aprobada` → `Implementada`. Un cambio en una spec `Implementada` sube su versión y se anota en su historial.

---

## 2. Principios no negociables

| ID | Principio | Por qué | Cómo se verifica |
| :--- | :--- | :--- | :--- |
| **P1** | **La spec manda.** El comportamiento del sistema es el que describe la spec; si el código difiere, el código está mal o la spec debe actualizarse primero. | SDD | Revisión del PR contra los CA de la spec |
| **P2** | **Clean Architecture por módulo.** El dominio no importa Express, PostgreSQL, Redis ni clientes HTTP. | ADR-001, EQ-06 | Revisar los `import` de `dominio/` |
| **P3** | **Monolito modular.** Cada módulo (`identidad`, `citas`, …) expone solo su `index.ts`; ningún módulo lee las tablas de otro. | ADR-001 | Revisión de imports entre módulos |
| **P4** | **Prueba por cada criterio de aceptación.** Los CA escritos como *Dado / Cuando / Entonces* se convierten en pruebas. | Definición de terminado | `npm test` en verde en CI |
| **P5** | **Servicios externos detrás de puertos.** RENIEC (PIDE) y SMS se usan solo a través de interfaces del dominio; en este proyecto se implementan con **servicios simulados**. | RC04, sin acceso a APIs reales | El caso de uso funciona cambiando solo la raíz de composición |
| **P6** | **Solo datos ficticios.** No se usan DNI, nombres ni teléfonos reales en pruebas, seeds ni demos. | RC06 · Ley 29733 | Revisión de los seeds del simulador |
| **P7** | **Contraseñas y tokens seguros.** Contraseñas con hash (bcrypt), sesiones con JWT de vida corta, todo el tráfico desplegado por HTTPS. | AC04 · EQ-04 | Pruebas de Identidad |
| **P8** | **Conventional Commits y PR por historia.** | RC02 | Historial de Git |

---

## 3. Stack tecnológico

Se mantiene el stack propuesto en el README y en el diseño interno.

| Capa | Tecnología | Nota |
| :--- | :--- | :--- |
| Frontend | Angular + TypeScript | Login, portal y reserva (Sprint 3) |
| Backend | Node.js + Express + TypeScript | Monolito modular con Clean Architecture |
| Base de datos | PostgreSQL | Repositorios en memoria para las pruebas unitarias |
| Caché | Redis | Opcional en desarrollo; el Decorator permite activarlo o retirarlo |
| Simuladores | Node.js + Express | `mock-pide-reniec` y `mock-sms` como servicios aparte |
| Pruebas | Jest + Supertest | Unitarias (dominio/aplicación) e integración (API + simuladores) |
| Contenedores | Docker + Docker Compose | Todo el sistema se levanta con un solo comando |
| CI | GitHub Actions | Pruebas y build en cada PR |

---

## 4. Convenciones de las specs

- Carpeta: `specs/<nnn>-<nombre-corto>/spec.md`, numeradas en orden de implementación.
- Encabezado con: HU y RF que cubre, estado, versión, sprint objetivo.
- Secciones: **Contexto**, **Alcance (incluye / no incluye)**, **Reglas de negocio**, **Contrato de API**, **Criterios de aceptación**, **Datos de prueba**, **Preguntas abiertas**.
- Reglas de negocio con códigos: `RN-` para Citas (continúa la numeración del diseño interno), `RI-` para Identidad.
- Errores de la API con el formato común:

```json
{ "error": { "codigo": "CITA_DUPLICADA", "mensaje": "Ya tienes una cita de Pediatría ese día" } }
```

| HTTP | Uso |
| :--- | :--- |
| 400 | Datos de entrada inválidos (formato) |
| 401 | Sin sesión o credenciales incorrectas |
| 403 | Sesión válida pero rol no autorizado |
| 404 | Recurso inexistente |
| 409 | Regla de negocio incumplida |
| 502 / 503 | Servicio externo (simulado) caído o con error |

---

## 5. Fuera de alcance por ahora

Historia clínica electrónica (HU03), referencias (HU04, HU05), dashboard y reportes GERESA (HU06, HU07) y auditoría (HU08). La arquitectura los contempla; en el portal aparecen como **"Próximamente"**. El 2FA (RF09) queda para el personal de salud cuando se implementen esos módulos. La traducción al quechua (EQ-05) se prepara dejando los textos del frontend en archivos de idioma, sin traducirlos todavía.
