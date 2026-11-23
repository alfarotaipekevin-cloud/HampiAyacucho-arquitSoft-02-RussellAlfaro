-- Esquema inicial de Hampi Ayacucho (Sprint 2): módulos Identidad y Citas.
-- Cada módulo es dueño de sus tablas; ningún módulo lee las tablas de otro (constitución, P3).

-- ===== Identidad =====
CREATE TABLE usuarios (
  id                uuid PRIMARY KEY,
  dni               char(8) NOT NULL UNIQUE,              -- RI-04
  nombres           text NOT NULL,
  apellido_paterno  text NOT NULL,
  apellido_materno  text NOT NULL,
  fecha_nacimiento  date NOT NULL,
  celular           char(9) NOT NULL,
  correo            text,
  hash_contrasena   text NOT NULL,                        -- bcrypt (RI-05)
  rol               text NOT NULL CHECK (rol IN ('PACIENTE', 'PERSONAL_SALUD', 'ESPECIALISTA_GERESA', 'ADMINISTRADOR')),
  intentos_fallidos int NOT NULL DEFAULT 0,
  bloqueado_hasta   timestamptz,                          -- RI-08
  creado_en         timestamptz NOT NULL DEFAULT now()
);

-- ===== Citas =====
CREATE TABLE especialidades (
  id     text PRIMARY KEY,
  nombre text NOT NULL
);

CREATE TABLE establecimientos (
  id           text PRIMARY KEY,
  nombre       text NOT NULL,
  nombre_corto text NOT NULL,
  nivel        text NOT NULL,
  provincia    text NOT NULL,
  direccion    text NOT NULL
);

-- Qué especialidades atiende cada establecimiento (RN-08)
CREATE TABLE ofertas (
  establecimiento_id text NOT NULL REFERENCES establecimientos (id),
  especialidad_id    text NOT NULL REFERENCES especialidades (id),
  PRIMARY KEY (establecimiento_id, especialidad_id)
);

CREATE TABLE cupos (
  id                 text PRIMARY KEY,
  establecimiento_id text NOT NULL,
  especialidad_id    text NOT NULL,
  consultorio        text NOT NULL,
  medico             text NOT NULL,
  fecha_hora         timestamptz NOT NULL,
  duracion_min       int NOT NULL DEFAULT 20,
  estado             text NOT NULL CHECK (estado IN ('DISPONIBLE', 'OCUPADO')),
  FOREIGN KEY (establecimiento_id, especialidad_id) REFERENCES ofertas (establecimiento_id, especialidad_id)
);
CREATE INDEX cupos_busqueda ON cupos (especialidad_id, establecimiento_id, fecha_hora) WHERE estado = 'DISPONIBLE';

CREATE TABLE citas (
  id              uuid PRIMARY KEY,
  codigo          text NOT NULL UNIQUE,
  paciente_id     uuid NOT NULL,          -- id de Identidad; sin FK a propósito (P3)
  dni_paciente    char(8) NOT NULL,
  cupo_id         text NOT NULL REFERENCES cupos (id),
  especialidad_id text NOT NULL,
  dia_lima        date NOT NULL,
  estado          text NOT NULL CHECK (estado IN ('RESERVADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO')),
  notificacion    text NOT NULL CHECK (notificacion IN ('ENVIADA', 'PENDIENTE')),
  creada_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX citas_paciente ON citas (paciente_id);
-- RN-11: un cupo tiene como máximo una cita activa
CREATE UNIQUE INDEX citas_un_cupo_activo ON citas (cupo_id) WHERE estado IN ('RESERVADA', 'ATENDIDA');
-- RN-02: una cita reservada por especialidad y día
CREATE UNIQUE INDEX citas_un_dia_por_especialidad ON citas (paciente_id, especialidad_id, dia_lima) WHERE estado = 'RESERVADA';
