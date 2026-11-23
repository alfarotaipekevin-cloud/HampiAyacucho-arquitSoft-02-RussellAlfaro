import { randomUUID } from 'node:crypto';
import { Dni } from '../../../shared/dominio/dni';
import { ReglaNegocioError } from '../../../shared/dominio/errores';
import { diaEnLima } from '../../../shared/dominio/fecha-lima';
import { Cupo } from './cupo';
import { EstadoCita, EstadoNotificacion } from './estado-cita';

export interface ContextoReserva {
  pacienteId: string;
  dni: Dni;
  cupo: Cupo;
  ahora: Date;
  /** RN-02: el caso de uso consulta el repositorio y pasa el resultado. */
  yaTieneCitaEseDiaEnLaEspecialidad: boolean;
  /** RN-10 */
  citasReservadasDelPaciente: number;
}

export interface DatosCita {
  id: string;
  codigo: string;
  pacienteId: string;
  dniPaciente: string;
  cupo: Cupo;
  estado: EstadoCita;
  notificacion: EstadoNotificacion;
  creadaEn: Date;
  /** Spec 007: hora en que el paciente llegó a admisión (null si aún no llega). */
  llegadaEn?: Date | null;
}

/** Entidad principal del módulo: contiene las reglas de la cita médica (spec 005, §3). */
export class Cita {
  static readonly MAX_CITAS_RESERVADAS = 3;
  static readonly HORAS_MINIMAS_CANCELACION = 2;
  /** RA-04: minutos de tolerancia después de la hora de la cita para registrar la llegada. */
  static readonly MINUTOS_TOLERANCIA = 20;

  private constructor(private datos: DatosCita) {}

  static reservar(c: ContextoReserva): Cita {
    if (c.cupo.fechaHora <= c.ahora) {
      throw new ReglaNegocioError('CUPO_VENCIDO', 'RN-09: la hora de este cupo ya pasó');
    }
    if (!c.cupo.estaDisponible()) {
      throw new ReglaNegocioError('CUPO_NO_DISPONIBLE', 'RN-01: el cupo ya no está disponible');
    }
    if (c.yaTieneCitaEseDiaEnLaEspecialidad) {
      throw new ReglaNegocioError('CITA_DUPLICADA', 'RN-02: ya tienes una cita en esta especialidad ese día');
    }
    if (c.citasReservadasDelPaciente >= Cita.MAX_CITAS_RESERVADAS) {
      throw new ReglaNegocioError('LIMITE_CITAS', `RN-10: puedes tener como máximo ${Cita.MAX_CITAS_RESERVADAS} citas reservadas`);
    }
    c.cupo.ocupar();

    const id = randomUUID();
    return new Cita({
      id,
      codigo: `HAMPI-${id.slice(0, 8).toUpperCase()}`, // RN-12: el QR solo lleva este código
      pacienteId: c.pacienteId,
      dniPaciente: c.dni.valor,
      cupo: c.cupo,
      estado: EstadoCita.RESERVADA,
      notificacion: 'PENDIENTE',
      creadaEn: c.ahora,
      llegadaEn: null,
    });
  }

  static restaurar(datos: DatosCita): Cita {
    return new Cita({ ...datos, llegadaEn: datos.llegadaEn ?? null });
  }

  get id() { return this.datos.id; }
  get codigo() { return this.datos.codigo; }
  get pacienteId() { return this.datos.pacienteId; }
  get dniPaciente() { return this.datos.dniPaciente; }
  get cupo() { return this.datos.cupo; }
  get estado() { return this.datos.estado; }
  get notificacion() { return this.datos.notificacion; }
  get creadaEn() { return this.datos.creadaEn; }
  get llegadaEn() { return this.datos.llegadaEn ?? null; }

  perteneceA(pacienteId: string): boolean {
    return this.datos.pacienteId === pacienteId;
  }

  registrarNotificacion(enviada: boolean): void {
    this.datos.notificacion = enviada ? 'ENVIADA' : 'PENDIENTE';
  }

  /**
   * RN-03: una cita atendida no puede cancelarse; al cancelar se libera el cupo.
   * RN-15: solo hasta 2 horas antes de la cita.
   */
  cancelar(ahora: Date): void {
    if (this.datos.estado === EstadoCita.ATENDIDA) {
      throw new ReglaNegocioError('CITA_ATENDIDA', 'RN-03: una cita atendida no puede cancelarse');
    }
    if (this.datos.estado !== EstadoCita.RESERVADA) {
      throw new ReglaNegocioError('CITA_NO_RESERVADA', 'Solo una cita reservada puede cancelarse');
    }
    if (this.datos.cupo.fechaHora.getTime() - ahora.getTime() < Cita.HORAS_MINIMAS_CANCELACION * 3600_000) {
      throw new ReglaNegocioError('FUERA_DE_PLAZO', `RN-15: solo puedes cancelar hasta ${Cita.HORAS_MINIMAS_CANCELACION} horas antes de la cita`);
    }
    this.datos.estado = EstadoCita.CANCELADA;
    this.datos.cupo.liberar();
  }

  esDelEstablecimiento(establecimientoId: string): boolean {
    return this.datos.cupo.establecimientoId === establecimientoId;
  }

  /** RA-04: pasó la tolerancia y el paciente no llegó. */
  vencioLaTolerancia(ahora: Date): boolean {
    return ahora.getTime() > this.datos.cupo.fechaHora.getTime() + Cita.MINUTOS_TOLERANCIA * 60_000;
  }

  /**
   * Spec 007 · Admisión: el personal registra que el paciente llegó.
   * RA-01 su establecimiento · RA-02 la cita es de hoy · RA-03 sigue reservada y sin llegada · RA-04 dentro de la tolerancia.
   */
  registrarLlegada(ahora: Date, establecimientoDelPersonal: string): void {
    if (!this.esDelEstablecimiento(establecimientoDelPersonal)) {
      throw new ReglaNegocioError('OTRO_ESTABLECIMIENTO', 'RA-01: esta cita es de otro establecimiento');
    }
    if (this.datos.estado !== EstadoCita.RESERVADA) {
      throw new ReglaNegocioError('CITA_NO_RESERVADA', `RA-03: la cita está ${this.datos.estado.toLowerCase().replace('_', ' ')}`);
    }
    if (this.datos.llegadaEn) {
      throw new ReglaNegocioError('LLEGADA_YA_REGISTRADA', 'RA-03: la llegada de este paciente ya se registró');
    }
    if (diaEnLima(this.datos.cupo.fechaHora) !== diaEnLima(ahora)) {
      throw new ReglaNegocioError('CITA_DE_OTRO_DIA', 'RA-02: la cita no es de hoy');
    }
    if (this.vencioLaTolerancia(ahora)) {
      throw new ReglaNegocioError('FUERA_DE_TOLERANCIA', `RA-04: pasaron más de ${Cita.MINUTOS_TOLERANCIA} minutos desde la hora de la cita`);
    }
    this.datos.llegadaEn = ahora;
  }

  /** RA-05: el personal marca la cita como atendida solo si el paciente llegó. */
  atender(establecimientoDelPersonal: string): void {
    if (!this.esDelEstablecimiento(establecimientoDelPersonal)) {
      throw new ReglaNegocioError('OTRO_ESTABLECIMIENTO', 'RA-01: esta cita es de otro establecimiento');
    }
    if (this.datos.estado === EstadoCita.RESERVADA && !this.datos.llegadaEn) {
      throw new ReglaNegocioError('SIN_LLEGADA', 'RA-05: primero registra la llegada del paciente');
    }
    this.confirmarAsistencia();
  }

  /** RN-04: solo una cita reservada puede marcarse como atendida. */
  confirmarAsistencia(): void {
    if (this.datos.estado !== EstadoCita.RESERVADA) {
      throw new ReglaNegocioError('CITA_NO_RESERVADA', 'RN-04: solo una cita reservada puede atenderse');
    }
    this.datos.estado = EstadoCita.ATENDIDA;
  }
}
