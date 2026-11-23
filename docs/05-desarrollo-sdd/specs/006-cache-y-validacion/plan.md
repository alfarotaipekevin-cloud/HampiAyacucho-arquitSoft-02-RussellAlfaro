# Plan técnico · Spec 006 · Caché, OpenAPI y validación

> **Sprint:** 4 del equipo (Sprint 2 del curso) · **Spec:** [spec.md](spec.md) · **Código:** `tecnologia/api/src/`, `tecnologia/pruebas-calidad/`

## 1. Decisiones

| Tema | Decisión | Motivo |
| :--- | :--- | :--- |
| Patrón de caché | Cache-aside con **Decorator** sobre `RepositorioCupos` y `RepositorioCitas` | Cumple ADR-004 sin tocar los casos de uso (SOLID: abierto/cerrado e inversión de dependencias) |
| Granularidad | Un día completo por clave | Si la clave incluyera la hora exacta de la consulta, nunca habría aciertos |
| Cliente Redis | `redis` v4 con `disableOfflineQueue` | Si Redis cae, los comandos fallan enseguida en vez de quedar en cola y colgar la petición |
| Serialización | JSON con `fechaHora` en ISO | Igual en Redis y en memoria; no se comparten referencias mutables |
| OpenAPI | Objeto TypeScript en vez de YAML | Se compila con la API, no necesita copiar archivos y una prueba lo compara con las rutas reales |
| Jest | `ts-jest`, tres proyectos (`unitarias`, `api`, `calidad`) + `integracion` aparte | La guía pide Jest; la integración necesita PostgreSQL y Redis reales |
| Umbral de cobertura | 70 % de líneas, 60 % de ramas | Se excluyen los repositorios PostgreSQL y el arranque, que se prueban en integración |
| k6 en local | Rampa 200 → 500 → 1,000 → 2,000 usuarios | El plan gratuito de Render (0.1 CPU) no representa la arquitectura |

## 2. Verificación

| Criterios | Prueba |
| :--- | :--- |
| CA-006-1 … CA-006-5 | `src/pruebas/unitarias/cache.test.ts`, `src/pruebas/integracion/redis.test.ts`, `src/pruebas/calidad/eq02-disponibilidad.test.ts` |
| CA-006-6, CA-006-7 | `src/pruebas/api/openapi.test.ts` |
| CA-006-8 | `tecnologia/pruebas-calidad/k6/eq01-disponibilidad.js` |
| CA-006-9 | `src/pruebas/calidad/eq04-seguridad.test.ts` |
| CA-006-10 | `src/pruebas/calidad/eq06-mantenibilidad.test.ts` |
