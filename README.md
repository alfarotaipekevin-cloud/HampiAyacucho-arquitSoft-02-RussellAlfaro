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
│   ├── 06-scrum/                    Roadmap y despliegue, product backlog, DoR/DoD y sprints
│   └── 07-validacion-calidad/       Sprint 2 del curso: BD y caché, Jest y cobertura, validación EQ-01…EQ-06
├── img/                             Diagramas (PNG) y sus fuentes editables en img/fuentes (Mermaid)
├── .github/workflows/ci.yml         CI: pruebas de cada paquete y verificación de Docker Compose
└── tecnologia/                      Ver tecnologia/README.md
    ├── boilerplate-clean-arquitecture/   Ejemplo ejecutable del módulo Citas con Clean Architecture
    ├── api/                         Backend: Identidad, Portal y Citas (Node.js + Express + PostgreSQL)
    ├── simuladores/                 Simuladores de la PIDE/RENIEC y del proveedor de SMS
    ├── pruebas-calidad/             k6 (hasta 2,000 usuarios), balanceador y análisis de la BD
    └── docker-compose.yml           Entorno local (PostgreSQL + Redis + simuladores + API + web)
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
| [Índice de specs](docs/05-desarrollo-sdd/README.md) | 001 APIs simuladas · 002 Identidad · 003 Portal · 004 Disponibilidad · 005 Reserva y ficha QR · 006 Caché, OpenAPI y validación |

### 6. Scrum

| Documento | Contenido |
| :--- | :--- |
| [00-roadmap-y-despliegue.md](docs/06-scrum/00-roadmap-y-despliegue.md) | Secuencia de sprints, arquitectura de despliegue y opciones de nube |
| [01-product-backlog.md](docs/06-scrum/01-product-backlog.md) | Backlog priorizado (MoSCoW) y trazabilidad HU → RF → spec |
| [02-definicion-de-listo-y-terminado.md](docs/06-scrum/02-definicion-de-listo-y-terminado.md) | Definition of Ready y Definition of Done |
| [03-guia-de-despliegue.md](docs/06-scrum/03-guia-de-despliegue.md) | Despliegue en Neon, Render y Vercel (ADR-009) |
| [Sprint 0](docs/06-scrum/sprint-00/sprint-backlog.md) · [Sprint 1](docs/06-scrum/sprint-01/sprint-backlog.md) · [Sprint 2](docs/06-scrum/sprint-02/sprint-backlog.md) · [Sprint 3](docs/06-scrum/sprint-03/sprint-backlog.md) · [Sprint 4](docs/06-scrum/sprint-04/sprint-backlog.md) | Sprint backlog, review y retrospectiva |

### 7. Implementación y validación de la arquitectura (Sprint 2 del curso)

| Documento | Contenido |
| :--- | :--- |
| [00-resumen-sprint-2.md](docs/07-validacion-calidad/00-resumen-sprint-2.md) | Actividades y entregables de la guía, con su evidencia |
| [01-analisis-base-de-datos-y-cache.md](docs/07-validacion-calidad/01-analisis-base-de-datos-y-cache.md) | `EXPLAIN ANALYZE` con 1.7 M de cupos, índices, concurrencia y caché Redis (ADR-004) |
| [02-pruebas-automatizadas-jest.md](docs/07-validacion-calidad/02-pruebas-automatizadas-jest.md) | 125 pruebas, cobertura de la API (94.6 % de líneas) y CI en GitHub Actions |
| [03-validacion-atributos-calidad.md](docs/07-validacion-calidad/03-validacion-atributos-calidad.md) | Resultados de EQ-01 a EQ-06 (k6 con 2,000 usuarios, Jest, axe-core) |
| API documentada | <http://localhost:3000/api/docs> (Swagger UI) |

## Stack tecnológico propuesto

Angular (frontend) · Node.js + Express + TypeScript (backend, monolito modular) · PostgreSQL con réplica de lectura · Redis (caché) · Git/GitHub con Conventional Commits.

## Ejemplo de código

```bash
cd tecnologia/boilerplate-clean-arquitecture
npm install
npm test      # 8 pruebas del módulo Citas
```

Entorno local completo (Sprint 2):

```bash
cd tecnologia
cp .env.example .env
docker compose up --build   # API (:3000) + PostgreSQL + PIDE/RENIEC (:4001) + SMS (:4002)
```
