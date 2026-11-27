import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { diaEnLima } from '../shared/dominio/fecha-lima';
import type { Cache } from '../shared/dominio/cache';
import { claveCuposDelDia } from '../modules/citas/infraestructura/cache-cupos';
import { OFERTAS } from './semilla';

/**
 * Citas de demostración del día (opcional, CITAS_DEMO=true).
 *
 * Para que la admisión y el portal del personal nunca se vean vacíos en una exposición,
 * cada día se reservan algunos cupos del Hospital Regional y de Huanta para pacientes ficticios.
 * Su estado depende de la hora: las citas que ya pasaron quedan atendidas (o como "no llegó"),
 * las cercanas a la hora actual quedan en espera y las demás por llegar.
 * Todo es ficticio (constitución, P6) y es idempotente: los ids salen del cupo, así que repetirlo no duplica nada.
 */

/** Pacientes ficticios para las citas de demostración. Contraseña: Hampi2026. */
export const PACIENTES_DEMO = [
  { dni: '70000101', nombres: 'Rosa', apellidoPaterno: 'Ayala', apellidoMaterno: 'Pariona' },
  { dni: '70000102', nombres: 'Juan Carlos', apellidoPaterno: 'Mendoza', apellidoMaterno: 'Tito' },
  { dni: '70000103', nombres: 'Lucía', apellidoPaterno: 'Gómez', apellidoMaterno: 'Palomino' },
  { dni: '70000104', nombres: 'Pedro', apellidoPaterno: 'Sulca', apellidoMaterno: 'Rojas' },
  { dni: '70000105', nombres: 'Ana', apellidoPaterno: 'Prado', apellidoMaterno: 'Vargas' },
  { dni: '70000106', nombres: 'Carmen', apellidoPaterno: 'Huaycha', apellidoMaterno: 'Llamocca' },
  { dni: '70000107', nombres: 'Miguel', apellidoPaterno: 'Ccente', apellidoMaterno: 'Yupanqui' },
  { dni: '70000108', nombres: 'Flor', apellidoPaterno: 'Janampa', apellidoMaterno: 'Quispe' },
  { dni: '70000109', nombres: 'Víctor', apellidoPaterno: 'Cárdenas', apellidoMaterno: 'Huamaní' },
  { dni: '70000110', nombres: 'Elena', apellidoPaterno: 'Bautista', apellidoMaterno: 'Ore' },
  { dni: '70000111', nombres: 'Raúl', apellidoPaterno: 'Tenorio', apellidoMaterno: 'Medina' },
  { dni: '70000112', nombres: 'Silvia', apellidoPaterno: 'Lapa', apellidoMaterno: 'Curo' },
];

/** Horarios del día que se reservan por servicio (índices de los 15 cupos de 08:00 a 12:40). */
const HORARIOS_DEMO = { hra: [0, 2, 3, 6, 7, 10, 12], hah: [0, 3, 7, 11] } as const;
/** Hospital Regional usa los pacientes 0..6 y Huanta los 7..10: nadie tiene dos citas de la misma especialidad el mismo día (RN-02). */
const DESPLAZAMIENTO = { hra: 0, hah: 7 } as const;
const MINUTOS_TOLERANCIA = 20;

const hash = (texto: string) => createHash('sha256').update(texto).digest('hex');
/** uuid determinista a partir de un texto, para que repetir la siembra no duplique citas. */
const uuidDe = (texto: string) => {
  const h = hash(texto);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

type Estado = { estado: 'RESERVADA' | 'ATENDIDA'; llegadaEn: Date | null };

/** Estado de una cita de demostración según la hora actual. */
export function estadoDemo(fechaHora: Date, ahora: Date, n: number): Estado {
  const minutos = (ahora.getTime() - fechaHora.getTime()) / 60000;
  const antes = (min: number) => new Date(fechaHora.getTime() - min * 60000);
  if (minutos > MINUTOS_TOLERANCIA) {
    // Ya pasó: casi todas se atendieron; una de cada cuatro no llegó.
    return n % 4 === 3 ? { estado: 'RESERVADA', llegadaEn: null } : { estado: 'ATENDIDA', llegadaEn: antes(12) };
  }
  if (minutos > -60) {
    // Cerca de la hora: el paciente ya llegó y espera su turno (si es muy pronto, todavía no).
    return minutos > -25 || n % 2 === 0 ? { estado: 'RESERVADA', llegadaEn: new Date(Math.min(ahora.getTime() - 3 * 60000, antes(15).getTime())) } : { estado: 'RESERVADA', llegadaEn: null };
  }
  return { estado: 'RESERVADA', llegadaEn: null };
}

/** Crea las cuentas de los pacientes ficticios (si faltan) y reserva sus citas del día. Devuelve cuántas citas creó. */
export async function sembrarCitasDelDia(bd: Pool, ahora: Date, hashContrasena: string, cache?: Cache): Promise<number> {
  const dia = diaEnLima(ahora);
  const cliente = await bd.connect();
  let creadas = 0;
  try {
    await cliente.query('BEGIN');
    const ids: string[] = [];
    for (const p of PACIENTES_DEMO) {
      const { rows } = await cliente.query<{ id: string }>(
        `INSERT INTO usuarios (id, dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, celular, hash_contrasena, rol)
         VALUES ($1, $2, $3, $4, $5, '1990-01-01', '999999999', $6, 'PACIENTE')
         ON CONFLICT (dni) DO UPDATE SET dni = EXCLUDED.dni RETURNING id`,
        [randomUUID(), p.dni, p.nombres, p.apellidoPaterno, p.apellidoMaterno, hashContrasena],
      );
      ids.push(rows[0].id);
    }

    for (const oferta of OFERTAS) {
      const est = oferta.establecimientoId as keyof typeof HORARIOS_DEMO;
      if (!(est in HORARIOS_DEMO)) continue;
      for (const [k, i] of HORARIOS_DEMO[est].entries()) {
        const minutos = 8 * 60 + i * 20;
        const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}${String(minutos % 60).padStart(2, '0')}`;
        const cupoId = `${oferta.establecimientoId}-${oferta.especialidadId}-${dia.replaceAll('-', '')}-${hora}`;
        const n = k + DESPLAZAMIENTO[est];
        const fechaHora = new Date(`${dia}T${hora.slice(0, 2)}:${hora.slice(2)}:00-05:00`);
        const { estado, llegadaEn } = estadoDemo(fechaHora, ahora, n);
        const paciente = PACIENTES_DEMO[n % PACIENTES_DEMO.length];
        // Solo si el cupo sigue libre: nunca se le quita un cupo a un paciente real (RN-01, RN-11).
        const r = await cliente.query(
          `INSERT INTO citas (id, codigo, paciente_id, dni_paciente, cupo_id, especialidad_id, dia_lima, estado, notificacion, llegada_en)
           SELECT $1, $2, $3, $4, c.id, c.especialidad_id, $5, $6, 'ENVIADA', $7 FROM cupos c
           WHERE c.id = $8 AND c.estado = 'DISPONIBLE'
           ON CONFLICT DO NOTHING`,
          [uuidDe(`demo-${cupoId}`), `HAMPI-${hash(`demo-${cupoId}`).slice(0, 8).toUpperCase()}`, ids[n % ids.length], paciente.dni,
            dia, estado, llegadaEn, cupoId],
        );
        if (r.rowCount) {
          await cliente.query(`UPDATE cupos SET estado = 'OCUPADO' WHERE id = $1`, [cupoId]);
          creadas++;
        } else {
          // Ya existía: avanza su estado con el paso de las horas (llega, luego se atiende), nunca hacia atrás.
          await cliente.query(
            `UPDATE citas SET estado = $2, llegada_en = COALESCE(llegada_en, $3)
             WHERE id = $1 AND estado = 'RESERVADA' AND ($2 = 'ATENDIDA' OR ($3::timestamptz IS NOT NULL AND llegada_en IS NULL))`,
            [uuidDe(`demo-${cupoId}`), estado, llegadaEn],
          );
        }
      }
      if (cache) await cache.borrar(claveCuposDelDia(oferta.especialidadId, oferta.establecimientoId, dia)).catch(() => undefined);
    }
    await cliente.query('COMMIT');
    return creadas;
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}
