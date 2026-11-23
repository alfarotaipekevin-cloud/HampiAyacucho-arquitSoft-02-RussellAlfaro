import { ClienteSms } from '../../../shared/infraestructura/cliente-sms';
import { MensajeroIdentidad } from '../dominio/codigo-recuperacion';

export class SmsMensajeroAdapter implements MensajeroIdentidad {
  constructor(private readonly sms: ClienteSms) {}

  enviarCodigo(celular: string, codigo: string) {
    return this.sms.enviar(celular, `Hampi: tu codigo para cambiar tu contrasena es ${codigo}. Vence en 10 minutos. No lo compartas con nadie.`);
  }
}
