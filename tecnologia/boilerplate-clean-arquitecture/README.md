# Boilerplate Clean Architecture · Módulo Citas · Hampi Ayacucho

Ejemplo **ejecutable** de cómo se organiza un módulo del monolito modular con Clean Architecture. Implementa el flujo **Reservar cita** (HU02 · RF02, RF03) documentado en `docs/04-modelo-c4/Nivel4-DiagramadeCodigo.md`.

> No es el sistema completo: es la referencia que todos los módulos deben seguir. No tiene dependencias en tiempo de ejecución (solo TypeScript para compilar).

## Requisitos

- Node.js 22 o superior

## Cómo ejecutarlo

```bash
cd tecnologia/boilerplate-clean-arquitecture
npm install        # solo la primera vez
npm test           # compila y ejecuta las 8 pruebas
npm start          # levanta la API de demo en http://localhost:3000
```

Probar la API de demo (en otra terminal):

```bash
curl -X POST http://localhost:3000/api/v1/citas -d "{\"dni\":\"45678912\",\"cupoId\":\"C-001\"}"
# 201 → {"citaId":"...","codigoQR":"HAMPI-...","especialidad":"Medicina General",...}
```

## Estructura

```text
src/
├── shared/errores.ts                      ReglaNegocioError
├── modules/citas/
│   ├── dominio/                           Entidades, objeto de valor, enumeración y puertos
│   │   ├── cita.ts · cupo.ts · dni.ts · estado-cita.ts
│   │   └── repositorio-citas.ts · repositorio-cupos.ts · validador-identidad.ts · notificador.ts
│   ├── aplicacion/                        Caso de uso y comando
│   ├── infraestructura/                   Implementaciones de los puertos (en memoria / simuladas)
│   ├── presentacion/citas.controller.ts   Traduce HTTP ⇄ caso de uso
│   ├── citas.module.ts                    Raíz de composición
│   └── index.ts                           API pública del módulo
├── pruebas/citas.test.ts                  Pruebas del dominio y del caso de uso
└── server.ts                              Servidor HTTP de demo (node:http)
```

## Implementaciones simuladas vs. producción

| Puerto (dominio) | En este ejemplo | En producción |
| :--- | :--- | :--- |
| `RepositorioCitas` | `CitasMemoriaRepository` | `CitasPostgresRepository` (PostgreSQL) |
| `RepositorioCupos` | `CuposCacheRepository` → `CuposMemoriaRepository` | `CuposRedisCacheRepository` → `CuposPostgresRepository` |
| `ValidadorIdentidad` | `PideSimuladoAdapter` | `PideAdapter` (RENIEC vía PIDE) |
| `Notificador` | `NotificadorConsolaAdapter` | `SmsNotificadorAdapter` |

Pasar a producción solo cambia `citas.module.ts`. **El dominio y el caso de uso no se modifican**: eso es lo que demuestra el escenario de mantenibilidad EQ-06.
