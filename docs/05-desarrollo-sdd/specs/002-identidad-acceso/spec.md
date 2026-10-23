# Spec 002 · Identidad y acceso al portal

| Campo | Valor |
| :--- | :--- |
| **Cubre** | HU09 (crear cuenta), HU10 (iniciar sesión), HU11 (recuperar contraseña) · RF02 (validar identidad ciudadana) · AC04 / EQ-04 |
| **Módulo** | `identidad` (en el diseño interno figura como "Usuarios") |
| **Estado** | En revisión |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 2 (backend) · Sprint 3 (pantallas) |

---

## 1. Contexto

Toda persona entra a Hampi por una misma puerta: el login, inspirado en el de EsSalud Digital. El módulo `identidad` es **compartido por todos los módulos**: registra la cuenta, valida el DNI contra RENIEC (simulado), inicia la sesión y entrega un **token JWT con el rol**. Los demás módulos (Citas hoy; HCE, Referencias y Reportes después) no manejan contraseñas: solo leen el usuario autenticado del token.

## 2. Alcance

**Incluye:** crear cuenta de paciente, iniciar sesión, "Recordar cuenta", recuperar contraseña por SMS, cerrar sesión, consultar el usuario actual, roles.
**No incluye (por ahora):** carné de extranjería u otros documentos (solo DNI), 2FA para personal de salud (RF09), administración de usuarios, inicio de sesión con redes sociales.

## 3. Pantallas (referencia para el Sprint 3)

| Pantalla | Elementos |
| :--- | :--- |
| **Login** | Logo Hampi · "Bienvenido(a)" · campo *Número de documento* · campo *Contraseña* con botón para mostrarla · casilla *Recordar cuenta* · botón **Ingresar** · enlace *¿Olvidaste tu contraseña?* · texto "¿Aún no tienes una cuenta Hampi?" · botón **Crear cuenta** · datos de contacto de la GERESA |
| **Crear cuenta** | Paso 1: DNI + fecha de nacimiento → se valida con RENIEC y se muestran los nombres. Paso 2: celular, correo (opcional), contraseña y confirmación, aceptación del tratamiento de datos (Ley 29733) |
| **Recuperar contraseña** | Paso 1: número de documento. Paso 2: código de 6 dígitos recibido por SMS + nueva contraseña |

---

## 4. Reglas de negocio

| ID | Regla |
| :--- | :--- |
| RI-01 | El número de documento es un DNI de 8 dígitos (reutiliza el objeto de valor `Dni`, RN-00). |
| RI-02 | Solo se crea la cuenta si RENIEC responde `0000` **y** la fecha de nacimiento ingresada coincide con la de RENIEC. |
| RI-03 | No se crea la cuenta si el DNI tiene restricción (`0002`). |
| RI-04 | Un DNI solo puede tener una cuenta. |
| RI-05 | La contraseña tiene al menos 8 caracteres, con al menos una letra y un número; se guarda con **bcrypt**, nunca en texto plano. |
| RI-06 | El celular tiene formato peruano (9 dígitos que empiezan en 9). |
| RI-07 | Ante credenciales incorrectas, el mensaje es siempre el mismo: *"Número de documento o contraseña incorrectos"* (no revela si el DNI tiene cuenta). |
| RI-08 | Tras **5 intentos fallidos** seguidos, la cuenta se bloquea **15 minutos**. |
| RI-09 | La sesión es un JWT firmado que dura **30 minutos** y contiene `sub` (id de usuario), `dni`, `nombre` y `rol`. |
| RI-10 | *Recordar cuenta* solo guarda el **número de documento** en el navegador; nunca la contraseña ni el token. |
| RI-11 | El código de recuperación tiene 6 dígitos, vence en **10 minutos** y admite como máximo **3 intentos**. |
| RI-12 | La solicitud de recuperación responde siempre igual, exista o no la cuenta (RI-07). |
| RI-13 | Las cuentas creadas desde la web tienen rol `PACIENTE`. Los roles `PERSONAL_SALUD`, `ESPECIALISTA_GERESA` y `ADMINISTRADOR` se crean por seed en esta etapa. |

---

## 5. Contrato de API

Base: `/api/v1/identidad`

### 5.1 Crear cuenta — `POST /registro`

```json
// petición
{ "dni": "70000001", "fechaNacimiento": "1990-04-15", "celular": "987654321",
  "correo": "maria@example.com", "contrasena": "Hampi2026", "aceptaTratamientoDatos": true }

// 201 Created
{ "usuarioId": "6f1c…", "nombreCompleto": "María Elena Quispe Huamán", "rol": "PACIENTE" }
```

Antes del paso 2, la pantalla puede verificar los datos con `POST /registro/verificar` `{ dni, fechaNacimiento }` → `200 { "nombreCompleto": "…" }`.

| Error | HTTP | `codigo` |
| :--- | :--- | :--- |
| Formato de DNI, celular o contraseña inválido | 400 | `DATOS_INVALIDOS` |
| No aceptó el tratamiento de datos | 400 | `CONSENTIMIENTO_REQUERIDO` |
| DNI no existe o fecha no coincide | 409 | `IDENTIDAD_NO_VALIDA` |
| DNI con restricción | 409 | `DNI_RESTRINGIDO` |
| Ya existe una cuenta | 409 | `CUENTA_EXISTENTE` |
| RENIEC no responde | 503 | `SERVICIO_IDENTIDAD_NO_DISPONIBLE` |

### 5.2 Iniciar sesión — `POST /sesion`

```json
// petición
{ "numeroDocumento": "70000001", "contrasena": "Hampi2026" }

// 200 OK
{ "token": "eyJ…", "expiraEn": 1800,
  "usuario": { "id": "6f1c…", "nombre": "María Elena", "rol": "PACIENTE" } }
```

| Error | HTTP | `codigo` |
| :--- | :--- | :--- |
| Credenciales incorrectas | 401 | `CREDENCIALES_INVALIDAS` |
| Cuenta bloqueada (RI-08) | 423 | `CUENTA_BLOQUEADA` (incluye `desbloqueoEn`) |

### 5.3 Usuario actual — `GET /yo` (requiere `Authorization: Bearer <token>`)

`200 { "id", "dni", "nombreCompleto", "celular", "rol" }` · sin token o vencido → `401 SESION_REQUERIDA`.

### 5.4 Recuperar contraseña

| Endpoint | Petición | Respuesta |
| :--- | :--- | :--- |
| `POST /recuperacion` | `{ "numeroDocumento": "70000001" }` | Siempre `202` con `{ "mensaje": "Si el documento tiene una cuenta, enviaremos un código al celular registrado" }` y el celular enmascarado si existe (`*****4321`) |
| `POST /recuperacion/confirmar` | `{ "numeroDocumento", "codigo", "nuevaContrasena" }` | `204` · errores `CODIGO_INVALIDO` (400), `CODIGO_VENCIDO` (410), `INTENTOS_AGOTADOS` (429) |

### 5.5 Middleware compartido

`identidad` exporta en su `index.ts` dos middlewares que usarán todos los módulos:

- `autenticarJwt` → valida el token y deja `req.usuario = { id, dni, nombre, rol }`; si falla, `401`.
- `autorizarRol(...roles)` → si el rol no está permitido, `403 ROL_NO_AUTORIZADO`.

---

## 6. Criterios de aceptación

| ID | Dado | Cuando | Entonces |
| :--- | :--- | :--- | :--- |
| CA-002-1 | el DNI `70000001` existe en RENIEC y no tiene cuenta | se registra con su fecha de nacimiento correcta y una contraseña válida | se crea la cuenta con rol `PACIENTE` (201) y la contraseña queda guardada con hash |
| CA-002-2 | el DNI `70000001` existe en RENIEC | se registra con otra fecha de nacimiento | responde 409 `IDENTIDAD_NO_VALIDA` y no se crea la cuenta |
| CA-002-3 | el DNI `70000004` tiene restricción | intenta registrarse | responde 409 `DNI_RESTRINGIDO` |
| CA-002-4 | el DNI `70000001` ya tiene cuenta | intenta registrarse otra vez | responde 409 `CUENTA_EXISTENTE` |
| CA-002-5 | el simulador PIDE está caído | alguien intenta registrarse | responde 503 `SERVICIO_IDENTIDAD_NO_DISPONIBLE` con un mensaje comprensible |
| CA-002-6 | existe una cuenta con contraseña `Hampi2026` | inicia sesión con esos datos | recibe un token válido por 30 minutos con su rol |
| CA-002-7 | existe una cuenta | inicia sesión con contraseña incorrecta | responde 401 con el mismo mensaje que para un DNI sin cuenta |
| CA-002-8 | una cuenta falló 4 veces | falla una quinta vez | queda bloqueada 15 minutos (423), aunque luego ponga la contraseña correcta |
| CA-002-9 | el usuario marcó *Recordar cuenta* | vuelve a abrir el login | el número de documento aparece precargado y la contraseña está vacía |
| CA-002-10 | existe una cuenta con celular `987654321` | solicita recuperar la contraseña | llega un SMS con un código de 6 dígitos al simulador y la respuesta muestra `*****4321` |
| CA-002-11 | se recibió un código hace más de 10 minutos | intenta usarlo | responde 410 `CODIGO_VENCIDO` |
| CA-002-12 | un token vencido o alterado | se llama a cualquier endpoint protegido | responde 401 |
| CA-002-13 | un usuario `PACIENTE` | llama a un endpoint restringido a `PERSONAL_SALUD` | responde 403 |

## 7. Preguntas abiertas

- ¿Se pedirá carné de extranjería? (afecta RI-01 y el objeto de valor `Dni`).
- ¿El 2FA (RF09) se exigirá también a pacientes? Por ahora solo a personal de salud y administradores en sprints futuros.
