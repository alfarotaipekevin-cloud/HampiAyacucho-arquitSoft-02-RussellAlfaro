import { Especialidad, Establecimiento } from './catalogo';
import { Cita } from './cita';
import { Cupo } from './cupo';

/** Puerto de lectura del catálogo de la red de salud. */
export interface RepositorioCatalogo {
  especialidades(): Promise<Especialidad[]>;
  especialidad(id: string): Promise<Especialidad | null>;
  establecimiento(id: string): Promise<Establecimiento | null>;
  /** RN-08: solo los establecimientos que atienden esa especialidad. */
  establecimientosConEspecialidad(especialidadId: string): Promise<Establecimiento[]>;
  /** Spec 007: servicios (especialidades) que atiende un establecimiento. */
  especialidadesDelEstablecimiento(establecimientoId: string): Promise<Especialidad[]>;
}

/** Puerto de lectura de cupos. */
export interface RepositorioCupos {
  buscarPorId(id: string): Promise<Cupo | null>;
  /** Cupos DISPONIBLES con fechaHora en (desde, hasta), ordenados por hora. */
  disponibles(especialidadId: string, establecimientoId: string, desde: Date, hasta: Date): Promise<Cupo[]>;
}

/** Puerto de persistencia de citas. */
export interface RepositorioCitas {
  contarReservadas(pacienteId: string): Promise<number>;
  existeReservadaEnEspecialidadYDia(pacienteId: string, especialidadId: string, dia: string): Promise<boolean>;
  /**
   * Guarda la cita y ocupa su cupo en una sola operación atómica (RN-11):
   * si otro paciente ganó el cupo, lanza CUPO_NO_DISPONIBLE y no guarda nada.
   */
  guardarReserva(cita: Cita): Promise<void>;
  actualizar(cita: Cita): Promise<void>;
  buscarPorId(id: string): Promise<Cita | null>;
  delPaciente(pacienteId: string): Promise<Cita[]>;
  /** Spec 007 · RN-12: el QR lleva solo el código. */
  buscarPorCodigo(codigo: string): Promise<Cita | null>;
  /** Spec 007 · agenda: citas de un día ('AAAA-MM-DD') de un servicio en un establecimiento, por hora. */
  delDia(establecimientoId: string, especialidadId: string, dia: string): Promise<Cita[]>;
}

/** Spec 007 · RA-01: en qué establecimiento trabaja cada persona del personal de salud. */
export interface RepositorioPersonal {
  establecimientoDe(dni: string): Promise<string | null>;
}
