-- Sprint 3 · HU11: códigos para recuperar la contraseña (RI-11). Uno vigente por usuario.
CREATE TABLE codigos_recuperacion (
  usuario_id  uuid PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  hash_codigo text NOT NULL,
  expira_en   timestamptz NOT NULL,
  intentos    int NOT NULL DEFAULT 0
);
