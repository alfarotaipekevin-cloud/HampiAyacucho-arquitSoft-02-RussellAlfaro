-- Sprint 2 · Actividad 5: análisis del comportamiento de la base de datos.
-- Crea un esquema aparte (analisis) con un volumen parecido al de un año de la red de salud
-- y mide con EXPLAIN ANALYZE las consultas del módulo Citas, con y sin los índices del esquema.
-- Uso: psql "$DATABASE_URL" -f analisis-bd.sql > resultados/analisis-bd.txt
\timing on
\pset pager off
DROP SCHEMA IF EXISTS analisis CASCADE;
CREATE SCHEMA analisis;
SET search_path = analisis;
SET timezone = 'America/Lima';

-- Volumen: 30 establecimientos x 10 especialidades x 18 cupos por día x 312 días hábiles ≈ 1.68 millones de cupos
CREATE TABLE cupos (LIKE public.cupos INCLUDING DEFAULTS);
INSERT INTO cupos (id, establecimiento_id, especialidad_id, consultorio, medico, fecha_hora, duracion_min, estado)
SELECT format('e%s-s%s-%s', e, s, to_char(d + h * interval '20 min', 'YYYYMMDDHH24MI')),
       'e' || e, 's' || s, 'Consultorio ' || s, 'Dr(a). ' || e || '-' || s,
       d + interval '8 hour' + h * interval '20 min', 20,
       CASE WHEN random() < 0.6 THEN 'OCUPADO' ELSE 'DISPONIBLE' END
FROM generate_series(1, 30) e, generate_series(1, 10) s,
     generate_series(date '2026-01-01', date '2026-12-31', interval '1 day') d,
     generate_series(0, 17) h
WHERE extract(dow FROM d) <> 0;
ALTER TABLE cupos ADD PRIMARY KEY (id);

CREATE TABLE citas (LIKE public.citas INCLUDING DEFAULTS);
INSERT INTO citas (id, codigo, paciente_id, dni_paciente, cupo_id, especialidad_id, dia_lima, estado, notificacion, creada_en)
SELECT gen_random_uuid(), 'HAMPI-' || upper(substr(md5(c.id), 1, 8)),
       -- ~200 mil pacientes; cada uno tiene a lo más una cita por especialidad y día (RN-02)
       ('00000000-0000-0000-0000-' || lpad(((row_number() OVER (PARTITION BY c.especialidad_id, c.fecha_hora::date ORDER BY c.id) * 997 + (c.fecha_hora::date - date '2026-01-01')) % 200000)::text, 12, '0'))::uuid,
       '70000001', c.id, c.especialidad_id, (c.fecha_hora AT TIME ZONE 'America/Lima')::date,
       CASE WHEN c.fecha_hora < now() THEN 'ATENDIDA' ELSE 'RESERVADA' END, 'ENVIADA', now()
FROM cupos c WHERE c.estado = 'OCUPADO';
ANALYZE cupos;
ANALYZE citas;

SELECT 'cupos' AS tabla, count(*) AS filas, pg_size_pretty(pg_total_relation_size('cupos')) AS tamano FROM cupos
UNION ALL
SELECT 'citas', count(*), pg_size_pretty(pg_total_relation_size('citas')) FROM citas;

\echo '=== C1. Disponibilidad de un día (HU01) SIN índice de búsqueda ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, fecha_hora, consultorio, medico FROM cupos
WHERE especialidad_id = 's3' AND establecimiento_id = 'e7' AND estado = 'DISPONIBLE'
  AND fecha_hora > '2026-11-05 00:00-05' AND fecha_hora < '2026-11-06 00:00-05'
ORDER BY fecha_hora;

\echo '=== Se crea el índice parcial del esquema (cupos_busqueda) ==='
CREATE INDEX cupos_busqueda ON cupos (especialidad_id, establecimiento_id, fecha_hora) WHERE estado = 'DISPONIBLE';
SELECT pg_size_pretty(pg_relation_size('cupos_busqueda')) AS tamano_indice_parcial;

\echo '=== C1. Disponibilidad de un día (HU01) CON índice parcial ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, fecha_hora, consultorio, medico FROM cupos
WHERE especialidad_id = 's3' AND establecimiento_id = 'e7' AND estado = 'DISPONIBLE'
  AND fecha_hora > '2026-11-05 00:00-05' AND fecha_hora < '2026-11-06 00:00-05'
ORDER BY fecha_hora;

\echo '=== C2. Calendario: 30 días de cupos libres (fechas) CON índice parcial ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, fecha_hora FROM cupos
WHERE especialidad_id = 's3' AND establecimiento_id = 'e7' AND estado = 'DISPONIBLE'
  AND fecha_hora > '2026-11-04 10:00-05' AND fecha_hora < '2026-12-05 00:00-05'
ORDER BY fecha_hora;

\echo '=== Comparación: índice completo (no parcial) sobre las mismas columnas ==='
CREATE INDEX cupos_busqueda_completo ON cupos (especialidad_id, establecimiento_id, fecha_hora);
SELECT pg_size_pretty(pg_relation_size('cupos_busqueda_completo')) AS tamano_indice_completo;
DROP INDEX cupos_busqueda_completo;

\echo '=== C3. RN-10: citas reservadas del paciente SIN índice ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*) FROM citas WHERE paciente_id = '00000000-0000-0000-0000-000000001234' AND estado = 'RESERVADA';
CREATE INDEX citas_paciente ON citas (paciente_id);
CREATE UNIQUE INDEX citas_un_cupo_activo ON citas (cupo_id) WHERE estado IN ('RESERVADA', 'ATENDIDA');
CREATE UNIQUE INDEX citas_un_dia_por_especialidad ON citas (paciente_id, especialidad_id, dia_lima) WHERE estado = 'RESERVADA';
ANALYZE citas;
\echo '=== C3. RN-10: citas reservadas del paciente CON índice citas_paciente ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*) FROM citas WHERE paciente_id = '00000000-0000-0000-0000-000000001234' AND estado = 'RESERVADA';

\echo '=== C4. RN-02: ¿ya tiene cita en la especialidad ese día? ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT 1 FROM citas ci JOIN cupos c ON c.id = ci.cupo_id
WHERE ci.paciente_id = '00000000-0000-0000-0000-000000001234' AND ci.estado = 'RESERVADA' AND c.especialidad_id = 's3'
  AND c.fecha_hora >= '2026-11-05 00:00-05' AND c.fecha_hora < '2026-11-06 00:00-05' LIMIT 1;

\echo '=== C5. Reserva atómica (RN-01/RN-11): UPDATE condicionado por la clave primaria ==='
SELECT id AS cupo_libre FROM cupos WHERE especialidad_id = 's3' AND establecimiento_id = 'e7' AND estado = 'DISPONIBLE' AND fecha_hora > '2026-11-05' ORDER BY fecha_hora LIMIT 1 \gset
BEGIN;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
UPDATE cupos SET estado = 'OCUPADO' WHERE id = :'cupo_libre' AND estado = 'DISPONIBLE';
\echo '--- Un segundo intento sobre el mismo cupo no actualiza ninguna fila (rowCount = 0 → 409 CUPO_NO_DISPONIBLE)'
UPDATE cupos SET estado = 'OCUPADO' WHERE id = :'cupo_libre' AND estado = 'DISPONIBLE';
ROLLBACK;

\echo '=== Uso de índices tras las consultas ==='
SELECT relname AS tabla, indexrelname AS indice, idx_scan AS lecturas, pg_size_pretty(pg_relation_size(indexrelid)) AS tamano
FROM pg_stat_user_indexes WHERE schemaname = 'analisis' ORDER BY relname, indexrelname;

DROP SCHEMA analisis CASCADE;
