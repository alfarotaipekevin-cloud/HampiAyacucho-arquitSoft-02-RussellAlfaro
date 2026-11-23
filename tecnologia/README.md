# Tecnología · Hampi Ayacucho

| Carpeta | Contenido | Sprint |
| :--- | :--- | :---: |
| `boilerplate-clean-arquitecture/` | Ejemplo de referencia del módulo Citas con Clean Architecture | Primer Sprint |
| `simuladores/mock-pide-reniec/` | Simulador de la consulta de DNI de RENIEC en la PIDE ([spec 001](../docs/05-desarrollo-sdd/specs/001-apis-simuladas/spec.md)) | 1 |
| `simuladores/mock-sms/` | Simulador del proveedor de SMS, con bandeja web para la demo | 1 |
| `api/` | Backend: módulos Identidad, Portal y Citas ([README](api/README.md)) | 2 |
| `web/` | Frontend en Angular: ingreso, portal y reserva de citas ([README](web/README.md)) | 3 |
| `docker-compose.yml` | Entorno local completo | 1–3 |

## Levantar todo con Docker

Requisitos: Docker Desktop (o Docker Engine con el plugin Compose).

```bash
cd tecnologia
cp .env.example .env
docker compose up --build
```

| Servicio | URL |
| :--- | :--- |
| **Web Hampi** | <http://localhost:4200> (entra con el DNI `70000001` y la contraseña `Hampi2026`) |
| API Hampi | http://localhost:3000/salud · rutas en `/api/v1` ([README](api/README.md)) |
| PostgreSQL | `localhost:5432` (usuario y clave `hampi`, base `hampi`) |
| Simulador PIDE/RENIEC | http://localhost:4001/salud |
| Simulador SMS | http://localhost:4002/salud · bandeja: http://localhost:4002/mensajes |

### Probar los simuladores

```bash
# Consultar un DNI ficticio
curl -X POST http://localhost:4001/reniec/consulta-dni -H "Content-Type: application/json" \
  -d "{\"nuDniConsulta\":\"70000001\",\"nuDniUsuario\":\"40000000\",\"password\":\"clave-entidad\"}"

# Enviar un SMS y verlo en http://localhost:4002/mensajes
curl -X POST http://localhost:4002/v1/mensajes -H "Content-Type: application/json" \
  -H "Authorization: Bearer clave-sms-local" \
  -d "{\"telefono\":\"+51987654321\",\"texto\":\"Hampi: prueba de SMS\"}"
```

DNIs de prueba: `70000001` a `70000003` (válidos), `70000004` (con restricción), `79999999` (provoca una falla 503). Ver la tabla completa en la spec 001.

## Ejecutar las pruebas sin Docker

Requisito: Node.js 22.

```bash
cd tecnologia/simuladores/mock-pide-reniec && npm install && npm test
cd tecnologia/simuladores/mock-sms && npm install && npm test
cd tecnologia/api && npm install && npm test
cd tecnologia/web && npm install && npm run build
```

Pruebas de atributos de calidad (k6, balanceador, análisis de la BD): [`pruebas-calidad/README.md`](pruebas-calidad/README.md).

Cada simulador también se puede levantar solo con `npm start`, y la web con `npm start`
(necesita la API en el puerto 3000). Las pruebas de punta a punta de la web están en
[`web/README.md`](web/README.md).
