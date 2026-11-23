import { Dni } from '../../../shared/dominio/dni';

/** Puerto hacia la PIDE / RENIEC: confirma que el DNI sigue vigente antes de reservar. */
export interface ValidadorIdentidad {
  /** Lanza SERVICIO_IDENTIDAD_NO_DISPONIBLE si RENIEC no responde (RN-14). */
  esVigente(dni: Dni): Promise<boolean>;
}

export interface AvisoCita {
  celular: string;
  codigo: string;
  especialidad: string;
  establecimiento: string;
  fechaHora: Date;
  consultorio: string;
}

/** Puerto hacia el servicio de mensajería. Devuelve false si no se pudo enviar (RN-13). */
export interface Notificador {
  citaReservada(aviso: AvisoCita): Promise<boolean>;
}

/** Datos del paciente que Citas pide al módulo Identidad (sin leer sus tablas, P3). */
export interface DirectorioPacientes {
  obtener(pacienteId: string): Promise<{ nombreCompleto: string; celular: string }>;
}

export interface GeneradorQR {
  /** Imagen PNG como data URL. */
  generar(contenido: string): Promise<string>;
}

