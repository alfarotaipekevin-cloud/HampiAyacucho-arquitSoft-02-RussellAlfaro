# 01. Análisis de la base de datos y de la estrategia de caché

> **Sprint 2 del curso · Actividad 5.** Decisiones que se validan: **ADR-004** (caché Redis para la disponibilidad) y **ADR-007** (separar lecturas de escrituras).
> **Evidencia reproducible:** [`tecnologia/pruebas-calidad/bd/analisis-bd.sql`](../../tecnologia/pruebas-calidad/bd/analisis-bd.sql) → salida completa en [`resultados/analisis-bd.txt`](../../tecnologia/pruebas-calidad/bd/resultados/analisis-bd.txt).

---

## 1. Qué consulta el módulo Citas

| # | Consulta | Dónde | Frecuencia | Tipo |
| :---: | :--- | :--- | :--- | :--- |
| C1 | Cupos libres de un día por especialidad y establecimiento (HU01) | `CuposPostgresRepository.disponibles` | **Muy alta** (cada paciente que mira el calendario) | Lectura |
| C2 | Días con cupos libres en los próximos 30 días (calendario) | `ConsultarDisponibilidadUseCase.fechas` | Muy alta | Lectura |
| C3 | ¿Cuántas citas reservadas tiene el paciente? (RN-10) | `CitasPostgresRepository.contarReservadas` | Una por reserva | Lectura |
| C4 | ¿Ya tiene cita en esa especialidad ese día? (RN-02) | `existeReservadaEnEspecialidadYDia` | Una por reserva | Lectura |
| C5 | Ocupar el cupo y guardar la cita (RN-01, RN-11) | `guardarReserva` (transacción) | Una por reserva | Escritura |

La relación lectura/escritura es muy desigual: en la prueba de carga (EQ-01) cada paciente hace dos lecturas (C1 y C2) cada 1 o 2 segundos, mientras que una reserva ocurre una sola vez al final. Por eso la optimización se concentra en C1 y C2.

## 2. Volumen de prueba

Para que los planes de ejecución sean realistas, el script crea un esquema aparte (`analisis`) con datos de **un año completo** de una red de 30 establecimientos:

| Tabla | Filas | Tamaño |
| :--- | ---: | ---: |
| `cupos` | 1,690,200 (30 establecimientos × 10 especialidades × 18 horarios × 313 días hábiles) | 242 MB |
| `citas` | 1,013,774 (el 60 % de los cupos ocupados) | 137 MB |

## 3. Resultados de `EXPLAIN ANALYZE`

| Consulta | Sin índice | Con el índice del esquema | Mejora |
| :--- | :--- | :--- | :--- |
| **C1** cupos libres de un día | *Parallel Seq Scan*: lee 22,565 páginas y descarta 563,397 filas por proceso · **69.6 ms** | *Index Scan* en `cupos_busqueda` · **0.04 ms** (5 páginas) | ≈ 1,700 veces más rápida |
| **C2** calendario de 30 días | — | *Bitmap Index Scan* en `cupos_busqueda` (207 filas) · **0.26 ms** | — |
| **C3** citas reservadas del paciente | *Parallel Seq Scan* sobre 1 millón de citas · **48.1 ms** | *Bitmap Index Scan* en `citas_paciente` · **0.03 ms** | ≈ 1,500 veces |
| **C4** cita el mismo día y especialidad | — | *Nested Loop*: `citas_paciente` + `cupos_pkey` · **0.02 ms** | — |
| **C5** ocupar el cupo | — | *Index Scan* en `cupos_pkey` + filtro `estado = 'DISPONIBLE'` · **0.12 ms** | — |

### 3.1 Por qué el índice de C1 es **parcial**

```sql
CREATE INDEX cupos_busqueda ON cupos (especialidad_id, establecimiento_id, fecha_hora)
  WHERE estado = 'DISPONIBLE';
```

- El orden de las columnas sigue el filtro de la consulta: primero igualdad (especialidad, establecimiento) y luego el rango de `fecha_hora`, que además entrega las filas **ya ordenadas** (no hace falta el `Sort` que aparece sin índice).
- Al indexar solo los cupos libres, el índice pesa **20 MB** frente a **51 MB** del mismo índice completo, y se achica a medida que los cupos se ocupan.
- Cuando un cupo pasa a `OCUPADO`, PostgreSQL lo saca del índice: la consulta nunca puede devolver un cupo ocupado por error de índice.

## 4. Concurrencia: cómo se evita la doble reserva

La reserva no confía en la caché ni en una lectura previa. Se hace en **una transacción** con dos garantías de la base de datos:

1. **Actualización condicionada (control optimista):**
   ```sql
   UPDATE cupos SET estado = 'OCUPADO' WHERE id = $1 AND estado = 'DISPONIBLE';
   ```
   Si dos pacientes piden el mismo cupo, PostgreSQL bloquea la fila: el primero actualiza 1 fila y el segundo **0 filas**, y la API responde `409 CUPO_NO_DISPONIBLE`. El script lo demuestra al final de C5 (`UPDATE 0`).
2. **Índices únicos parciales** como última barrera:
   - `citas_un_cupo_activo (cupo_id) WHERE estado IN ('RESERVADA','ATENDIDA')` → RN-11.
   - `citas_un_dia_por_especialidad (paciente_id, especialidad_id, dia_lima) WHERE estado = 'RESERVADA'` → RN-02, incluso si el mismo paciente envía dos reservas a la vez.

Pruebas que lo verifican contra PostgreSQL real: `pruebas/integracion/postgres.test.ts` (*dos pacientes piden el mismo cupo a la vez*, *de 10 reservas simultáneas solo 1 se guarda*, *RN-02 con dos reservas simultáneas del mismo paciente*).

## 5. Conexiones

- La API usa un *pool* de `pg` con **20 conexiones** por instancia (`PG_POOL_MAX`). Neon (plan gratuito) admite hasta ~100 conexiones a través de su *pooler*; con 2 instancias quedan 40 en uso.
- Con la caché activa, la mayoría de las lecturas no llegan a la base, así que el pool casi no se satura (ver §6 y EQ-01).

## 6. Estrategia de caché (ADR-004)

### 6.1 Diseño

| Aspecto | Decisión |
| :--- | :--- |
| Patrón | **Cache-aside**: se lee la caché; si no está (MISS), se consulta PostgreSQL y se guarda. |
| Qué se guarda | Los cupos **libres de un día completo** por especialidad y establecimiento. |
| Clave | `hampi:cupos:{especialidad}:{establecimiento}:{AAAA-MM-DD}` (no depende de la hora de la consulta, así la reutilizan todos los pacientes). |
| Tiempo de vida (TTL) | 60 segundos, como red de seguridad. |
| Invalidación | Al **reservar** o **cancelar**, se borra la clave de ese día. También si la reserva pierde la carrera (409). |
| Si Redis falla | Se lee de PostgreSQL y la API sigue respondiendo (EQ-02). |
| Dónde vive en el código | Dos decoradores en `modules/citas/infraestructura/cache-cupos.ts`. Los casos de uso **no saben** que existe la caché (la prueba EQ-06 lo comprueba). |
| Implementaciones | `CacheRedis` (producción y Docker Compose), `CacheMemoria` (pruebas y desarrollo) y `SinCache` (para medir sin caché con `CACHE_DESACTIVADA=true`). |

```text
Paciente ─GET /cupos─► ConsultarDisponibilidadUseCase ─► CuposConCacheRepository ─┬─ HIT ─► Redis
                                                                                 └─ MISS ─► CuposPostgresRepository ─► PostgreSQL
Paciente ─POST /citas─► ReservarCitaUseCase ─► CitasConInvalidacionRepository ─► PostgreSQL (transacción)
                                                              └──── DEL clave del día ───► Redis
```

### 6.2 ¿Puede la caché mostrar un cupo ya ocupado?

Solo durante el instante entre que otro paciente reserva y se borra la clave (milisegundos), o hasta 60 s si Redis estuvo caído justo en ese momento. En ese caso, el paciente que intente reservarlo recibe `409 CUPO_NO_DISPONIBLE` y la pantalla le pide elegir otro: **nunca hay doble reserva**, porque la garantía está en la base de datos (§4), no en la caché.

### 6.3 Medición

| Medición | Resultado | Evidencia |
| :--- | :--- | :--- |
| Lectura de un día desde PostgreSQL vs. Redis (prueba de integración) | MISS ≈ 2.3 ms · HIT ≈ 0.3 ms | `pruebas/integracion/redis.test.ts` |
| Tasa de aciertos durante la prueba de carga de 2,000 usuarios | Ver EQ-01 en [03-validacion-atributos-calidad.md](03-validacion-atributos-calidad.md) | `GET /salud` → `cache.tasaAciertos` |
| Con caché vs. sin caché bajo carga | Ver EQ-01 | `pruebas-calidad/k6/resultados/` |

## 7. Conclusiones

1. Los índices del esquema son los correctos para las consultas reales: todas usan índice y responden en menos de 0.3 ms con 1.7 millones de cupos.
2. El índice parcial reduce a menos de la mitad el espacio y mantiene fuera los cupos ocupados.
3. La consistencia de las reservas la garantiza PostgreSQL (UPDATE condicionado + índices únicos), así que la caché puede ser agresiva sin riesgo de doble reserva.
4. La réplica de lectura de ADR-007 **no hace falta en esta etapa**: la caché absorbe la mayor parte de las lecturas. Se reevaluará cuando se agreguen los reportes (módulo Indicadores).
