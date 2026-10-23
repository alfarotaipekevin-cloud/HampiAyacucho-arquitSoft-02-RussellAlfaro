# Plataforma Digital de Salud Regional - Hampi Ayacucho

## Integrante
- Russell Kevin Alfaro Taipe

## Descripción
Plataforma web regional para la gestión descentralizada de citas médicas en consultorios externos, consulta de historias clínicas electrónicas e interoperabilidad de referencias entre establecimientos de la red de salud de Ayacucho.

## Caso de estudio
GERESA Ayacucho – Hospital Regional "Miguel Ángel Mariscal Llerena" y Redes de Salud de Ayacucho.

## Curso
Arquitectura de Software [IS-488] - Semestre 2026-II
Docente: Ing. Lizbeth Jaico Quispe

## Estructura del repositorio

```text
├── docs/
│   ├── 01-analisis-de-sistema/      Necesidad, actores, HU, requisitos, atributos, restricciones, drivers, ADR, escenarios
│   ├── 02-arquitectura-software/    Arquitectura inicial, estilo, enfoque y componentes
│   ├── 03-diseño-de-software/
│   │   └── diseño-interno/          Diseño interno de módulos, patrones y principios SOLID
│   ├── 04-modelo-c4/                Niveles 1 a 4 del modelo C4
│   ├── 05-desarrollo-sdd/           Constitución SDD y especificaciones (specs) del módulo de citas
│   └── 06-scrum/                    Roadmap y despliegue, product backlog, DoR/DoD y sprints
├── img/                             Diagramas (PNG) y sus fuentes editables en img/fuentes (Mermaid)
└── tecnologia/
    └── boilerplate-clean-arquitecture/   Ejemplo ejecutable del módulo Citas con Clean Architecture
```

## Documentación

### 1. Análisis del sistema

| N.º | Entregable | Documento |
| :--- | :--- | :--- |
| 1 | Necesidad del negocio | [00-necesidad-del-negocio.md](docs/01-analisis-de-sistema/00-necesidad-del-negocio.md) |
| 2 | Requisitos | [01-actores.md](docs/01-analisis-de-sistema/01-actores.md) · [02-historias-del-usuario.md](docs/01-analisis-de-sistema/02-historias-del-usuario.md) · [03-requisitos-funcionales.md](docs/01-analisis-de-sistema/03-requisitos-funcionales.md) · [05-restricciones.md](docs/01-analisis-de-sistema/05-restricciones.md) |
| 3 | Atributos de calidad | [04-atributos-de-calidad.md](docs/01-analisis-de-sistema/04-atributos-de-calidad.md) · [08-escenarios-atributos-calidad.md](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md) |
| 4 | Drivers arquitectónicos | [06-driver-arquitectonicos.md](docs/01-analisis-de-sistema/06-driver-arquitectonicos.md) |
| 5 | Decisiones arquitectónicas (ADR) | [07-decisiones-arquitectonicas.md](docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md) |

### 2. Arquitectura de software

| N.º | Entregable | Documento |
| :--- | :--- | :--- |
| — | Arquitectura inicial (Guía 02) | [arquitectura-inicial.md](docs/02-arquitectura-software/arquitectura-inicial.md) |
| 6 | Estilo arquitectónico | [estilo-arquitectonico.md](docs/02-arquitectura-software/estilo-arquitectonico.md) |
| 7 | Enfoque arquitectónico: Clean Architecture | [enfoque-arquitectonico.md](docs/02-arquitectura-software/enfoque-arquitectonico.md) |
| 9 | Componentes arquitectónicos | [componentes-arquitectonicos.md](docs/02-arquitectura-software/componentes-arquitectonicos.md) |

### 3. Diseño de software

| N.º | Entregable | Documento |
| :--- | :--- | :--- |
| 10 | Diseño interno de módulos | [diseño-interno-de-modulos.md](docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md) |
| 10 | Patrones de diseño | [patrones-de-diseño.md](docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md) |
| 10 | Principios de diseño (SOLID) | [principios-de-diseño.md](docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md) |

### 4. Modelo C4

| Nivel | Documento |
| :--- | :--- |
| C1 · Contexto | [Nivel1-DiagramadeContextodelSistema.md](docs/04-modelo-c4/Nivel1-DiagramadeContextodelSistema.md) |
| C2 · Contenedores | [Nivel2-DiagramadeContenedores.md](docs/04-modelo-c4/Nivel2-DiagramadeContenedores.md) |
| C3 · Componentes | [Nivel3-Diagrama-de-Componentes.md](docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md) |
| C4 · Código | [Nivel4-DiagramadeCodigo.md](docs/04-modelo-c4/Nivel4-DiagramadeCodigo.md) |

### 5. Desarrollo guiado por especificaciones (SDD)

Alcance actual: **módulo de reserva de citas** y acceso al portal.

| Documento | Contenido |
| :--- | :--- |
| [00-constitucion.md](docs/05-desarrollo-sdd/00-constitucion.md) | Proceso SDD, principios, stack y convenciones |
| [Índice de specs](docs/05-desarrollo-sdd/README.md) | 001 APIs simuladas · 002 Identidad · 003 Portal · 004 Disponibilidad · 005 Reserva y ficha QR |

### 6. Scrum

| Documento | Contenido |
| :--- | :--- |
| [00-roadmap-y-despliegue.md](docs/06-scrum/00-roadmap-y-despliegue.md) | Secuencia de sprints, arquitectura de despliegue y opciones de nube |
| [01-product-backlog.md](docs/06-scrum/01-product-backlog.md) | Backlog priorizado (MoSCoW) y trazabilidad HU → RF → spec |
| [02-definicion-de-listo-y-terminado.md](docs/06-scrum/02-definicion-de-listo-y-terminado.md) | Definition of Ready y Definition of Done |
| [Sprint 0](docs/06-scrum/sprint-00/sprint-backlog.md) | Sprint backlog, review y retrospectiva |

## Stack tecnológico propuesto

Angular (frontend) · Node.js + Express + TypeScript (backend, monolito modular) · PostgreSQL con réplica de lectura · Redis (caché) · Git/GitHub con Conventional Commits.

## Ejemplo de código

```bash
cd tecnologia/boilerplate-clean-arquitecture
npm install
npm test      # 8 pruebas del módulo Citas
```
