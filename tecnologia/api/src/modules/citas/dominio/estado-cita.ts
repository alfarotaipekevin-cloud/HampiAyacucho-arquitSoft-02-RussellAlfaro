export enum EstadoCita {
  RESERVADA = 'RESERVADA',
  ATENDIDA = 'ATENDIDA',
  CANCELADA = 'CANCELADA',
  NO_ASISTIO = 'NO_ASISTIO',
}

/** RN-13: si el SMS falla la cita sigue reservada y la notificación queda pendiente. */
export type EstadoNotificacion = 'ENVIADA' | 'PENDIENTE';
