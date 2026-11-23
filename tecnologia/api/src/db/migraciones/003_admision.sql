-- Spec 007 · Admisión con QR (Sprint 2 del curso).
-- Hora en que el paciente llegó a admisión. La cita sigue RESERVADA hasta que se marca ATENDIDA.
ALTER TABLE citas ADD COLUMN llegada_en timestamptz;

-- Establecimiento donde trabaja cada persona del personal de salud (RA-01).
-- Es del módulo Citas: se identifica por DNI y no lee la tabla usuarios de Identidad (P3).
CREATE TABLE personal_establecimiento (
  dni                char(8) PRIMARY KEY,
  establecimiento_id text NOT NULL REFERENCES establecimientos (id)
);

-- Agenda del día de un servicio en un establecimiento (RA-02)
CREATE INDEX citas_agenda ON citas (dia_lima, especialidad_id);
