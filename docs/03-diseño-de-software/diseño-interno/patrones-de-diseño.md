# Patrones de diseño

## Objetivo

Documentar los patrones de diseño aplicados en el backend de Hampi Ayacucho: dónde se usan, qué problema resuelven y con qué tecnología se implementan, para que el equipo programe de forma uniforme.

## Contexto

- **Estilo:** monolito modular (Node.js + Express + TypeScript).
- **Enfoque interno:** Clean Architecture.
- **Base:** diagrama de componentes (C4 nivel 3).

## Patrones aplicados

| Patrón | Dónde se usa | Problema que resuelve | Se implementa con | Archivos en el código |
| :--- | :--- | :--- | :--- | :--- |
| **Adapter** | Usuarios / Citas → PIDE (RENIEC) | La PIDE tiene su propio formato, credenciales y protocolo | API REST de la PIDE | `validador-identidad.ts`, `pide.adapter.ts` |
| **Adapter** | HCE → RENHICE (MINSA) | El RENHICE usa la norma técnica de intercambio del MINSA | API REST del RENHICE | `repositorio-nacional-hce.ts`, `renhice.adapter.ts` |
| **Adapter** | Notificaciones → servicio de mensajería | Cada proveedor de SMS/correo tiene una API distinta | API REST del proveedor | `notificador.ts`, `sms-notificador.adapter.ts` |
| **Repository** | Todos los módulos → PostgreSQL | El negocio no debe conocer SQL | PostgreSQL (`pg` u ORM) | `repositorio-citas.ts`, `citas-postgres.repository.ts` |
| **Decorator** | Citas → caché de cupos | Consultar cupos más rápido sin modificar el repositorio (EQ-01) | Redis | `cupos-redis-cache.repository.ts` |
| **Chain of Responsibility** | API REST → middlewares | Cada petición pasa por varias validaciones antes de llegar al caso de uso | Middlewares de Express | `cors`, `autenticar-jwt`, `verificar-2fa`, `autorizar-rol`, `validar-entrada` |
| **CORS** | API REST | El navegador bloquea peticiones desde otro origen | Cabeceras CORS | `cors` (solo el dominio de la aplicación web) |

## Cómo funciona cada patrón

| Patrón | En pocas palabras |
| :--- | :--- |
| Adapter | Traduce: el sistema dice `validar(dni)` y el adaptador lo convierte en la llamada propia de la PIDE. |
| Repository | El negocio dice `guardar(cita)`; el repositorio escribe el SQL. |
| Decorator | Busca primero en Redis; si no está, consulta PostgreSQL y lo guarda en Redis. Al reservar, invalida la caché. |
| Chain of Responsibility | La petición pasa por CORS → JWT → 2FA → rol → validación; cualquiera puede detenerla con 401/403/400. |
| CORS | Solo la aplicación web de Hampi puede llamar a la API desde el navegador. |

## Ejemplo: Adapter hacia la PIDE

```ts
// dominio/validador-identidad.ts  → lo que el negocio necesita
export interface ValidadorIdentidad {
  validar(dni: Dni): Promise<boolean>;
}

// infraestructura/pide.adapter.ts  → cómo se cumple con la PIDE
export class PideAdapter implements ValidadorIdentidad {
  constructor(private readonly http: ClienteHttp, private readonly credenciales: CredencialesPide) {}

  async validar(dni: Dni): Promise<boolean> {
    // La URL y el formato exactos dependen del convenio con la PIDE.
    const respuesta = await this.http.post('/reniec/consulta-dni', { nuDni: dni.valor, ...this.credenciales });
    return respuesta.codigoResultado === '0000';
  }
}
```

En `tecnologia/boilerplate-clean-arquitecture/` se usa `PideSimuladoAdapter`, que implementa la misma interfaz sin llamar a la PIDE.

## Beneficio

- Cambiar la versión de la PIDE, del RENHICE o el proveedor de SMS solo afecta a su adaptador.
- La caché con Redis se puede activar o retirar sin tocar las reglas de negocio.
- La seguridad (JWT, 2FA, roles) se agrega o reordena en la cadena de middlewares sin modificar los controladores.

## Patrones previstos para siguientes iteraciones

| Patrón | Dónde se aplicaría | Cuándo |
| :--- | :--- | :--- |
| **Observer** | Citas / Referencias → Notificaciones y HCE → Auditoría | Al implementar los eventos en memoria entre módulos |
| **Circuit Breaker** | Adaptadores de PIDE y RENHICE | Si los servicios del Estado presentan caídas frecuentes (EQ-02) |
| **Factory** | Reportes | Si cada tipo de reporte MINSA requiere una construcción distinta |
| **Facade** | Comunicación entre módulos | Cuando los módulos crezcan y necesiten una única puerta de entrada |
