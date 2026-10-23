/** Datos de entrada del caso de uso (llegan desde el controlador). */
export interface ReservarCitaCommand {
  dni: string;
  cupoId: string;
}

export interface CitaReservada {
  citaId: string;
  codigoQR: string;
  especialidad: string;
  establecimiento: string;
  fechaHora: string;
}
