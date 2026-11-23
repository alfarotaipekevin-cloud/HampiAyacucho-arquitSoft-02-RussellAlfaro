# Plan técnico · Spec 002 · Identidad y acceso

> **Sprint:** 2 (backend) · **Spec:** [spec.md](spec.md) · **Código:** `tecnologia/api/src/modules/identidad/`

## 1. Decisiones

| Tema | Decisión | Motivo |
| :--- | :--- | :--- |
| Contraseñas | `bcryptjs` (costo 10; 4 en pruebas) | RI-05; versión en JavaScript puro, sin compilación nativa en Docker Alpine |
| Sesión | JWT HS256 con `jsonwebtoken`, 30 min, `sub` + `dni` + `nombre` + `rol` | RI-09; sin estado en el servidor, sirve con varias instancias (EQ-03) |
| Enumeración de cuentas | Mismo mensaje y, si el DNI no tiene cuenta, se compara igual contra un hash señuelo | RI-07: ni el texto ni el tiempo de respuesta revelan qué DNIs tienen cuenta |
| Bloqueo | Contador de intentos y `bloqueado_hasta` en la tabla `usuarios` | RI-08; sobrevive a reinicios y funciona con varias instancias |
| RENIEC | Puerto `RegistroCivil` → `RegistroCivilPideAdapter` → `ClientePide` (compartido con Citas) | P5; el mismo cliente HTTP sirve al simulador y a la PIDE real |
| Otros módulos | `identidad.module.ts` expone `autenticarJwt`, `autorizarRol` y `consultarPerfil` | P3: Citas obtiene el celular del paciente sin leer la tabla `usuarios` |

## 2. Archivos

```text
modules/identidad/
├── dominio/        usuario.ts (RI-08, RI-13) · credenciales.ts (RI-05, RI-06) · errores-identidad.ts
│                   puertos: repositorio-usuarios.ts · registro-civil.ts · hasheador.ts · emisor-tokens.ts
├── aplicacion/     verificar-identidad · registrar-usuario · iniciar-sesion · consultar-perfil (.use-case.ts)
├── infraestructura/ usuarios-memoria / usuarios-postgres (.repository.ts) · hasheador-bcrypt.ts · emisor-jwt.ts
│                   registro-civil-pide.adapter.ts
├── presentacion/   identidad.routes.ts · middlewares.ts (autenticarJwt, autorizarRol)
├── identidad.module.ts   raíz de composición
└── index.ts              API pública
```

## 3. Sprint 3 · HU11 y pantallas

**Recuperar contraseña (RI-11, RI-12).** `codigo-recuperacion.ts` define el código de un solo uso
(6 dígitos, 10 minutos, 3 intentos) y los puertos `RepositorioCodigos` y `MensajeroIdentidad`.
`RecuperarContrasenaUseCase` tiene dos operaciones:

| Operación | Reglas |
| :--- | :--- |
| `solicitar` | Responde siempre lo mismo (RI-12); solo añade el celular enmascarado `*****4321` si la cuenta existe. El código se guarda **hasheado** con bcrypt, igual que una contraseña |
| `confirmar` | Valida la contraseña nueva (RI-05), el formato del código, su vigencia (`CODIGO_VENCIDO`, 410) y los intentos (`INTENTOS_AGOTADOS`, 429, borra el código). Al acertar cambia la contraseña, **reinicia el bloqueo** por intentos fallidos y borra el código |

Se añadieron los tipos de error `VENCIDO` (410) y `DEMASIADOS_INTENTOS` (429), y la migración
`002_recuperacion_contrasena.sql` con la tabla `codigos_recuperacion` (un código vigente por usuario).

**Pantallas (`tecnologia/web`).** Ingreso estilo EsSalud Digital en `/ingresar`, creación de cuenta en
dos pasos y recuperación en dos pasos. *Recordar cuenta* guarda **solo el número de documento** en
`localStorage` (RI-10, CA-002-9); el token vive aparte y el interceptor lo añade a cada llamada.

## 4. Verificación

| Criterios | Prueba |
| :--- | :--- |
| CA-002-1 … CA-002-8, CA-002-12, CA-002-13 | `src/pruebas/api/identidad.test.ts` |
| CA-002-10, CA-002-11, RI-11, RI-12 (HU11) | `src/pruebas/api/identidad.test.ts` (bloque "recuperar la contraseña") |
| CA-002-10 con PostgreSQL y el simulador SMS real | `src/pruebas/integracion/postgres.test.ts` |
| CA-002-7, CA-002-9 en el navegador | `tecnologia/web/e2e/reserva.spec.ts` |
| RI-05, RI-06, RI-08, RI-13 | `src/pruebas/unitarias/dominio.test.ts` |
| CA-002-1 con PostgreSQL y el simulador PIDE real | `src/pruebas/integracion/postgres.test.ts` |
