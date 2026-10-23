# Spec 001 · APIs simuladas (PIDE/RENIEC y SMS)

| Campo | Valor |
| :--- | :--- |
| **Cubre** | RC04 · Sistemas externos de `01-actores.md` · HT01, HT02 del product backlog |
| **Estado** | En revisión |
| **Versión** | 1.0 |
| **Sprint objetivo** | Sprint 1 |

---

## 1. Contexto

Hampi depende de dos servicios externos a los que un proyecto académico no tiene acceso: la **PIDE** (para consultar el DNI en RENIEC) y un **proveedor de SMS**. Para poder desarrollar y probar, se construyen dos **simuladores**: servicios web independientes que responden como lo haría el servicio real, con datos ficticios.

El backend nunca sabe si habla con el simulador o con el servicio real: lo usa a través de los puertos `ValidadorIdentidad` y `Notificador` (constitución, P5).

## 2. Alcance

**Incluye:** consulta de DNI con datos ficticios; envío de SMS que se guarda y se puede ver en una página; forma de simular fallas para probar errores.
**No incluye:** el formato SOAP/credenciales exactos de la PIDE real, envío real de SMS, correo electrónico.

---

## 3. Simulador `mock-pide-reniec`

Imita el estilo del servicio "Consulta de DNI" de la PIDE (campos con prefijos `nu`, `ap`, `co`), simplificado a REST + JSON.

### 3.1 Contrato

```http
POST /reniec/consulta-dni
Content-Type: application/json

{ "nuDniConsulta": "70000001", "nuDniUsuario": "40000000", "password": "clave-entidad" }
```

**Respuesta 200 — persona encontrada**

```json
{
  "coResultado": "0000",
  "deResultado": "Consulta realizada correctamente",
  "datosPersona": {
    "nuDni": "70000001",
    "prenombres": "MARÍA ELENA",
    "apPrimer": "QUISPE",
    "apSegundo": "HUAMÁN",
    "feNacimiento": "1990-04-15",
    "ubigeo": "050101",
    "restriccion": null
  }
}
```

| `coResultado` | Significado | HTTP |
| :--- | :--- | :--- |
| `0000` | Persona encontrada | 200 |
| `0001` | DNI no existe | 200 |
| `0002` | DNI con restricción (p. ej. fallecido, cancelado) — `restriccion` indica el motivo | 200 |
| `1000` | Credenciales de la entidad inválidas | 401 |
| `9999` | Error interno simulado | 503 |

### 3.2 Reglas del simulador

| ID | Regla |
| :--- | :--- |
| MP-01 | Los datos salen de un archivo `personas.json` dentro del simulador; **todos son ficticios** (DNIs de la serie `7000000x`). |
| MP-02 | Si `nuDniConsulta` no tiene 8 dígitos responde 400. |
| MP-03 | Las credenciales válidas se configuran con variables de entorno (`PIDE_USUARIO`, `PIDE_PASSWORD`). |
| MP-04 | Modo falla: con `MOCK_FALLA=true` o el DNI `79999999`, responde `9999` / 503 para probar la indisponibilidad (EQ-02). |
| MP-05 | Latencia configurable (`MOCK_LATENCIA_MS`, por defecto 200 ms) para que las pruebas se parezcan a un servicio real. |

### 3.3 Datos de prueba (`personas.json`)

| DNI | Nombre | Nacimiento | Caso |
| :--- | :--- | :--- | :--- |
| 70000001 | María Elena Quispe Huamán | 1990-04-15 | Paciente adulta, flujo feliz |
| 70000002 | José Luis Huamán Cárdenas | 1985-11-02 | Segundo paciente (pruebas de concurrencia) |
| 70000003 | Rosa Pariona Gamboa | 2015-07-20 | Menor de edad (pediatría) |
| 70000004 | Carlos Ccahuana Ore | 1970-01-30 | `restriccion: "FALLECIDO"` |
| 70000099 | Personal de Salud Demo | 1988-08-08 | Usuario con rol `PERSONAL_SALUD` (seed) |
| 79999999 | — | — | Provoca falla 503 |

---

## 4. Simulador `mock-sms`

### 4.1 Contrato

```http
POST /v1/mensajes
Authorization: Bearer <SMS_API_KEY>
Content-Type: application/json

{ "telefono": "+51987654321", "texto": "Hampi: tu cita HAMPI-1A2B3C4D es el 05/11 a las 08:20 en Pediatría." }
```

**Respuesta 202**

```json
{ "id": "sms_01H...", "estado": "ENCOLADO", "recibidoEn": "2026-11-01T13:20:00Z" }
```

| Endpoint | Uso |
| :--- | :--- |
| `GET /v1/mensajes?telefono=+51987654321` | Lista los mensajes enviados (JSON) — lo usan las pruebas de integración |
| `GET /mensajes` | Página HTML tipo "bandeja de celular" para la demo |
| `DELETE /v1/mensajes` | Limpia la bandeja entre pruebas |

### 4.2 Reglas del simulador

| ID | Regla |
| :--- | :--- |
| MS-01 | El teléfono debe tener formato peruano `+519XXXXXXXX`; si no, 400. |
| MS-02 | El texto tiene como máximo 160 caracteres; si no, 400. |
| MS-03 | Sin `Authorization` válido responde 401. |
| MS-04 | Modo falla: con `MOCK_FALLA=true` o el teléfono `+51900000000`, responde 503. |
| MS-05 | Los mensajes se guardan en memoria (se pierden al reiniciar; es suficiente para pruebas y demo). |

---

## 5. Criterios de aceptación

| ID | Dado | Cuando | Entonces |
| :--- | :--- | :--- | :--- |
| CA-001-1 | el simulador PIDE está levantado | se consulta el DNI `70000001` con credenciales válidas | responde 200, `coResultado = "0000"` y los nombres de María Elena Quispe Huamán |
| CA-001-2 | el simulador PIDE está levantado | se consulta un DNI que no está en `personas.json` | responde 200 con `coResultado = "0001"` |
| CA-001-3 | el simulador PIDE está levantado | se consulta el DNI `70000004` | responde `coResultado = "0002"` y `restriccion = "FALLECIDO"` |
| CA-001-4 | el simulador PIDE está levantado | se envían credenciales incorrectas | responde 401 con `coResultado = "1000"` |
| CA-001-5 | el simulador PIDE está levantado | se consulta el DNI `79999999` | responde 503 |
| CA-001-6 | el simulador SMS está levantado | se envía un SMS válido | responde 202 y el mensaje aparece en `GET /v1/mensajes` y en la página `/mensajes` |
| CA-001-7 | el simulador SMS está levantado | se envía a un teléfono con formato inválido | responde 400 y no guarda el mensaje |
| CA-001-8 | ambos simuladores tienen `Dockerfile` | se ejecuta `docker compose up` | ambos responden en `/salud` con 200 |

## 6. Preguntas abiertas

- ¿La docente pedirá acercarse al formato SOAP real de la PIDE? Si es así, solo se cambia el simulador y `pide.adapter.ts`.
