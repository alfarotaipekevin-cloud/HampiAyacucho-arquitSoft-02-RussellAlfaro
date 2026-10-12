import { randomUUID } from 'node:crypto';
import { ReglaNegocioError } from '../../../shared/errores';
import { Cupo } from './cupo';
import { Dni } from './dni';
import { EstadoCita } from './estado-cita';

/** Entidad principal del módulo: contiene las reglas de la cita médica. */
export class Cita {
  private constructor(
    readonly id: string,
    readonly dniPaciente: Dni,
    readonly cupo: Cupo,
    private estado: EstadoCita,
    readonly codigoQR: string,
  ) {}

  /**
   * RN-01: solo se reserva un cupo disponible.
   * RN-02: el paciente no puede tener otra cita en la misma especialidad el mismo día
   *        (el caso de uso consulta el repositorio y pasa el resultado).
   */
  static reservar(dni: Dni, cupo: Cupo, yaTieneCitaEseDia: boolean): Cita {
    if (yaTieneCitaEseDia) {
      throw new ReglaNegocioError('RN-02: el paciente ya tiene una cita en esa especialidad ese día');
    }
    cupo.ocupar(); // valida RN-01
    const id = randomUUID();
    return new Cita(id, dni, cupo, EstadoCita.RESERVADA, `HAMPI-${id.slice(0, 8).toUpperCase()}`);
  }

  /** RN-03: una cita atendida no puede cancelarse; al cancelar se libera el cupo. */
  cancelar(): void {
    if (this.estado === EstadoCita.ATENDIDA) {
      throw new ReglaNegocioError('RN-03: una cita atendida no puede cancelarse');
    }
    this.estado = EstadoCita.CANCELADA;
    this.cupo.liberar();
  }

  /** RN-04: solo una cita reservada puede marcarse como atendida. */
  confirmarAsistencia(): void {
    if (this.estado !== EstadoCita.RESERVADA) {
      throw new ReglaNegocioError('RN-04: solo una cita reservada puede atenderse');
    }
    this.estado = EstadoCita.ATENDIDA;
  }

  obtenerEstado(): EstadoCita {
    return this.estado;
  }
}
