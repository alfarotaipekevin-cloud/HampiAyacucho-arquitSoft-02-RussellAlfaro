import { Cita } from '../dominio/cita';
import { Notificador } from '../dominio/notificador';

/** En producción: SmsNotificadorAdapter con el proveedor de SMS. */
export class NotificadorConsolaAdapter implements Notificador {
  enviados: string[] = [];

  async citaReservada(cita: Cita): Promise<void> {
    const mensaje = `Hampi: su cita de ${cita.cupo.especialidad} fue reservada. Código ${cita.codigoQR}`;
    this.enviados.push(mensaje);
  }
}
