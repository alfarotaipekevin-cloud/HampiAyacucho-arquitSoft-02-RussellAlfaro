import { Pool } from 'pg';
import { ReglaNegocioError } from '../../../shared/dominio/errores';
import { inicioDelDiaEnLima, sumarDias } from '../../../shared/dominio/fecha-lima';
import { Especialidad, Establecimiento } from '../dominio/catalogo';
import { Cita } from '../dominio/cita';
import { Cupo, EstadoCupo } from '../dominio/cupo';
import { EstadoCita, EstadoNotificacion } from '../dominio/estado-cita';
import { RepositorioCatalogo, RepositorioCitas, RepositorioCupos, RepositorioPersonal } from '../dominio/repositorios';

const COLUMNAS_ESTABLECIMIENTO = 'id, nombre, nombre_corto AS "nombreCorto", nivel, provincia, direccion';

export class CatalogoPostgresRepository implements RepositorioCatalogo {
  constructor(private readonly bd: Pool) {}

  async especialidades() {
    const { rows } = await this.bd.query<Especialidad>('SELECT id, nombre FROM especialidades ORDER BY nombre');
    return rows;
  }

  async especialidad(id: string) {
    const { rows } = await this.bd.query<Especialidad>('SELECT id, nombre FROM especialidades WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async establecimiento(id: string) {
    const { rows } = await this.bd.query<Establecimiento>(
      `SELECT ${COLUMNAS_ESTABLECIMIENTO} FROM establecimientos WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async establecimientosConEspecialidad(especialidadId: string) {
    const { rows } = await this.bd.query<Establecimiento>(
      `SELECT ${COLUMNAS_ESTABLECIMIENTO} FROM establecimientos e
       WHERE EXISTS (SELECT 1 FROM ofertas o WHERE o.establecimiento_id = e.id AND o.especialidad_id = $1)
       ORDER BY e.nombre`,
      [especialidadId],
    );
    return rows;
  }

  async especialidadesDelEstablecimiento(establecimientoId: string) {
    const { rows } = await this.bd.query<Especialidad>(
      `SELECT e.id, e.nombre FROM especialidades e
       JOIN ofertas o ON o.especialidad_id = e.id AND o.establecimiento_id = $1
       ORDER BY e.nombre`,
      [establecimientoId],
    );
    return rows;
  }
}

const COLUMNAS_CUPO = `c.id, c.establecimiento_id AS "establecimientoId", c.especialidad_id AS "especialidadId",
  c.consultorio, c.medico, c.fecha_hora AS "fechaHora", c.duracion_min AS "duracionMin", c.estado`;

interface FilaCupo {
  id: string; establecimientoId: string; especialidadId: string; consultorio: string; medico: string;
  fechaHora: Date; duracionMin: number; estado: EstadoCupo;
}

export class CuposPostgresRepository implements RepositorioCupos {
  constructor(private readonly bd: Pool) {}

  async buscarPorId(id: string) {
    const { rows } = await this.bd.query<FilaCupo>(`SELECT ${COLUMNAS_CUPO} FROM cupos c WHERE c.id = $1`, [id]);
    return rows[0] ? new Cupo(rows[0]) : null;
  }

  async disponibles(especialidadId: string, establecimientoId: string, desde: Date, hasta: Date) {
    const { rows } = await this.bd.query<FilaCupo>(
      `SELECT ${COLUMNAS_CUPO} FROM cupos c
       WHERE c.especialidad_id = $1 AND c.establecimiento_id = $2 AND c.estado = 'DISPONIBLE'
         AND c.fecha_hora > $3 AND c.fecha_hora < $4
       ORDER BY c.fecha_hora`,
      [especialidadId, establecimientoId, desde, hasta],
    );
    return rows.map((f) => new Cupo(f));
  }
}

interface FilaCita extends FilaCupo {
  cita_id: string; codigo: string; paciente_id: string; dni_paciente: string;
  cita_estado: EstadoCita; notificacion: EstadoNotificacion; creada_en: Date; llegada_en: Date | null; reprogramaciones: number;
}

const SELECT_CITA = `SELECT ci.id AS cita_id, ci.codigo, ci.paciente_id, ci.dni_paciente, ci.estado AS cita_estado,
  ci.notificacion, ci.creada_en, ci.llegada_en, ci.reprogramaciones, ${COLUMNAS_CUPO}
  FROM citas ci JOIN cupos c ON c.id = ci.cupo_id`;

const aCita = (f: FilaCita) =>
  Cita.restaurar({
    id: f.cita_id, codigo: f.codigo, pacienteId: f.paciente_id, dniPaciente: f.dni_paciente,
    estado: f.cita_estado, notificacion: f.notificacion, creadaEn: f.creada_en, llegadaEn: f.llegada_en,
    reprogramaciones: f.reprogramaciones,
    cupo: new Cupo({
      id: f.id, establecimientoId: f.establecimientoId, especialidadId: f.especialidadId, consultorio: f.consultorio,
      medico: f.medico, fechaHora: f.fechaHora, duracionMin: f.duracionMin, estado: f.estado,
    }),
  });

export class CitasPostgresRepository implements RepositorioCitas {
  constructor(private readonly bd: Pool) {}

  async contarReservadas(pacienteId: string) {
    const { rows } = await this.bd.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM citas WHERE paciente_id = $1 AND estado = 'RESERVADA'`, [pacienteId]);
    return rows[0].total;
  }

  async existeReservadaEnEspecialidadYDia(pacienteId: string, especialidadId: string, dia: string) {
    const inicio = inicioDelDiaEnLima(dia);
    const { rows } = await this.bd.query(
      `SELECT 1 FROM citas ci JOIN cupos c ON c.id = ci.cupo_id
       WHERE ci.paciente_id = $1 AND ci.estado = 'RESERVADA' AND c.especialidad_id = $2
         AND c.fecha_hora >= $3 AND c.fecha_hora < $4 LIMIT 1`,
      [pacienteId, especialidadId, inicio, sumarDias(inicio, 1)],
    );
    return rows.length > 0;
  }

  /**
   * RN-11: el UPDATE solo ocupa el cupo si sigue DISPONIBLE; PostgreSQL bloquea la fila,
   * así que de dos reservas simultáneas solo una afecta 1 fila. El índice único
   * citas_un_dia_por_especialidad protege RN-02 ante dos pestañas del mismo paciente.
   */
  async guardarReserva(cita: Cita) {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const ocupado = await cliente.query(
        `UPDATE cupos SET estado = 'OCUPADO' WHERE id = $1 AND estado = 'DISPONIBLE'`, [cita.cupo.id]);
      if (ocupado.rowCount !== 1) {
        throw new ReglaNegocioError('CUPO_NO_DISPONIBLE', 'RN-01: el cupo ya no está disponible');
      }
      await cliente.query(
        `INSERT INTO citas (id, codigo, paciente_id, dni_paciente, cupo_id, especialidad_id, dia_lima, estado, notificacion, creada_en)
         VALUES ($1, $2, $3, $4, $5, $6, (($7::timestamptz) AT TIME ZONE 'America/Lima')::date, $8, $9, $10)`,
        [cita.id, cita.codigo, cita.pacienteId, cita.dniPaciente, cita.cupo.id, cita.cupo.especialidadId,
          cita.cupo.fechaHora, cita.estado, cita.notificacion, cita.creadaEn],
      );
      await cliente.query('COMMIT');
    } catch (e: any) {
      await cliente.query('ROLLBACK');
      if (e?.code === '23505' && e?.constraint === 'citas_un_dia_por_especialidad') {
        throw new ReglaNegocioError('CITA_DUPLICADA', 'RN-02: ya tienes una cita en esta especialidad ese día');
      }
      throw e;
    } finally {
      cliente.release();
    }
  }

  async actualizar(cita: Cita) {
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('UPDATE citas SET estado = $2, notificacion = $3, llegada_en = $4 WHERE id = $1',
        [cita.id, cita.estado, cita.notificacion, cita.llegadaEn]);
      await cliente.query('UPDATE cupos SET estado = $2 WHERE id = $1', [cita.cupo.id, cita.cupo.estaDisponible() ? 'DISPONIBLE' : 'OCUPADO']);
      await cliente.query('COMMIT');
    } catch (e) {
      await cliente.query('ROLLBACK');
      throw e;
    } finally {
      cliente.release();
    }
  }

  /**
   * RR-08: como en la reserva, el UPDATE solo ocupa el nuevo cupo si sigue DISPONIBLE.
   * La cita solo se mueve si sigue RESERVADA, sin llegada y con el mismo conteo (otra pestaña no la cambió antes).
   * El índice citas_un_dia_por_especialidad protege RN-02.
   */
  async reprogramar(cita: Cita, cupoAnterior: Cupo) {
    const cupoAnteriorId = cupoAnterior.id;
    const cliente = await this.bd.connect();
    try {
      await cliente.query('BEGIN');
      const ocupado = await cliente.query(
        `UPDATE cupos SET estado = 'OCUPADO' WHERE id = $1 AND estado = 'DISPONIBLE'`, [cita.cupo.id]);
      if (ocupado.rowCount !== 1) {
        throw new ReglaNegocioError('CUPO_NO_DISPONIBLE', 'RN-01: el cupo ya no está disponible');
      }
      const movida = await cliente.query(
        `UPDATE citas SET cupo_id = $2, dia_lima = (($3::timestamptz) AT TIME ZONE 'America/Lima')::date,
           reprogramaciones = $4, notificacion = $5
         WHERE id = $1 AND cupo_id = $6 AND estado = 'RESERVADA' AND llegada_en IS NULL AND reprogramaciones = $4 - 1`,
        [cita.id, cita.cupo.id, cita.cupo.fechaHora, cita.reprogramaciones, cita.notificacion, cupoAnteriorId],
      );
      if (movida.rowCount !== 1) {
        throw new ReglaNegocioError('CITA_CAMBIADA', 'La cita cambió mientras la reprogramabas; vuelve a intentarlo');
      }
      await cliente.query(`UPDATE cupos SET estado = 'DISPONIBLE' WHERE id = $1`, [cupoAnteriorId]);
      await cliente.query('COMMIT');
    } catch (e: any) {
      await cliente.query('ROLLBACK');
      if (e?.code === '23505' && e?.constraint === 'citas_un_dia_por_especialidad') {
        throw new ReglaNegocioError('CITA_DUPLICADA', 'RN-02: ya tienes una cita en esta especialidad ese día');
      }
      throw e;
    } finally {
      cliente.release();
    }
  }

  async buscarPorId(id: string) {
    const { rows } = await this.bd.query<FilaCita>(`${SELECT_CITA} WHERE ci.id = $1`, [id]);
    return rows[0] ? aCita(rows[0]) : null;
  }

  async delPaciente(pacienteId: string) {
    const { rows } = await this.bd.query<FilaCita>(`${SELECT_CITA} WHERE ci.paciente_id = $1`, [pacienteId]);
    return rows.map(aCita);
  }

  async buscarPorCodigo(codigo: string) {
    const { rows } = await this.bd.query<FilaCita>(`${SELECT_CITA} WHERE ci.codigo = $1`, [codigo]);
    return rows[0] ? aCita(rows[0]) : null;
  }

  /** Usa el índice citas_agenda (dia_lima, especialidad_id). */
  async delDia(establecimientoId: string, especialidadId: string, dia: string) {
    const { rows } = await this.bd.query<FilaCita>(
      `${SELECT_CITA} WHERE ci.dia_lima = $1 AND ci.especialidad_id = $2 AND c.establecimiento_id = $3 ORDER BY c.fecha_hora`,
      [dia, especialidadId, establecimientoId],
    );
    return rows.map(aCita);
  }
}

export class PersonalPostgresRepository implements RepositorioPersonal {
  constructor(private readonly bd: Pool) {}

  async establecimientoDe(dni: string) {
    const { rows } = await this.bd.query<{ establecimiento_id: string }>(
      'SELECT establecimiento_id FROM personal_establecimiento WHERE dni = $1', [dni]);
    return rows[0]?.establecimiento_id ?? null;
  }
}
