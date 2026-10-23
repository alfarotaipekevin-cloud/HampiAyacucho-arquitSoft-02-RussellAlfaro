import { Cita } from './cita';

export interface Notificador {
  citaReservada(cita: Cita): Promise<void>;
}
