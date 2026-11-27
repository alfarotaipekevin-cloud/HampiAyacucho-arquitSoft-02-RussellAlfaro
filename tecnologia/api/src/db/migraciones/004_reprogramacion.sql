-- Spec 008 · Reprogramar cita.
-- Cuántas veces se cambió la fecha u hora de la cita (RR-03: máximo 2). El código QR no cambia (RR-07).
ALTER TABLE citas ADD COLUMN reprogramaciones smallint NOT NULL DEFAULT 0
  CHECK (reprogramaciones BETWEEN 0 AND 2);
