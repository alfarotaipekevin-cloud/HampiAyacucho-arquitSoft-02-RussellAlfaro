import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

const BLOQUEO_MIGRACIONES = 48_802_026; // número cualquiera para pg_advisory_lock

/** Aplica, en orden, los archivos .sql de migraciones/ que aún no se aplicaron. */
export async function migrar(bd: Pool, carpeta = join(__dirname, 'migraciones')): Promise<string[]> {
  const cliente = await bd.connect();
  const aplicadas: string[] = [];
  try {
    await cliente.query('SELECT pg_advisory_lock($1)', [BLOQUEO_MIGRACIONES]); // evita que dos instancias migren a la vez
    await cliente.query(`CREATE TABLE IF NOT EXISTS esquema_migraciones (
      nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await cliente.query<{ nombre: string }>('SELECT nombre FROM esquema_migraciones');
    const hechas = new Set(rows.map((r) => r.nombre));

    for (const archivo of (await readdir(carpeta)).filter((a) => a.endsWith('.sql')).sort()) {
      if (hechas.has(archivo)) continue;
      await cliente.query('BEGIN');
      try {
        await cliente.query(await readFile(join(carpeta, archivo), 'utf8'));
        await cliente.query('INSERT INTO esquema_migraciones (nombre) VALUES ($1)', [archivo]);
        await cliente.query('COMMIT');
        aplicadas.push(archivo);
      } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await cliente.query('SELECT pg_advisory_unlock($1)', [BLOQUEO_MIGRACIONES]).catch(() => undefined);
    cliente.release();
  }
  return aplicadas;
}
