import { Pool } from 'pg';
import { CodigoRecuperacion, RepositorioCodigos } from '../dominio/codigo-recuperacion';

export class CodigosMemoriaRepository implements RepositorioCodigos {
  private readonly filas = new Map<string, CodigoRecuperacion>();

  async guardar(codigo: CodigoRecuperacion) {
    this.filas.set(codigo.usuarioId, { ...codigo });
  }

  async buscar(usuarioId: string) {
    const fila = this.filas.get(usuarioId);
    return fila ? { ...fila } : null;
  }

  async eliminar(usuarioId: string) {
    this.filas.delete(usuarioId);
  }
}

export class CodigosPostgresRepository implements RepositorioCodigos {
  constructor(private readonly bd: Pool) {}

  async guardar(c: CodigoRecuperacion) {
    await this.bd.query(
      `INSERT INTO codigos_recuperacion (usuario_id, hash_codigo, expira_en, intentos) VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE SET hash_codigo = $2, expira_en = $3, intentos = $4`,
      [c.usuarioId, c.hashCodigo, c.expiraEn, c.intentos],
    );
  }

  async buscar(usuarioId: string) {
    const { rows } = await this.bd.query(
      `SELECT usuario_id AS "usuarioId", hash_codigo AS "hashCodigo", expira_en AS "expiraEn", intentos
       FROM codigos_recuperacion WHERE usuario_id = $1`,
      [usuarioId],
    );
    return (rows[0] as CodigoRecuperacion | undefined) ?? null;
  }

  async eliminar(usuarioId: string) {
    await this.bd.query('DELETE FROM codigos_recuperacion WHERE usuario_id = $1', [usuarioId]);
  }
}
