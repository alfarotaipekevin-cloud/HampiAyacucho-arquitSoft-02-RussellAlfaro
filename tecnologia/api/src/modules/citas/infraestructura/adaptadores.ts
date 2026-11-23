import QRCode from 'qrcode';
import { Dni } from '../../../shared/dominio/dni';
import { ClientePide } from '../../../shared/infraestructura/cliente-pide';
import { ClienteSms } from '../../../shared/infraestructura/cliente-sms';
import { AvisoCita, GeneradorQR, Notificador, ValidadorIdentidad } from '../dominio/servicios-externos';

/** ValidadorIdentidad con la PIDE: vigente solo si RENIEC responde 0000. */
export class PideValidadorAdapter implements ValidadorIdentidad {
  constructor(private readonly pide: ClientePide) {}

  async esVigente(dni: Dni) {
    return (await this.pide.consultarDni(dni.valor)).estado === 'VALIDO';
  }
}

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Texto del SMS de la spec 005, §4.3 (máx. 160 caracteres, sin tildes). */
export function textoSmsCita(a: AvisoCita): string {
  const lima = new Date(a.fechaHora.getTime() - 5 * 3600_000);
  const fecha = `${dosDigitos(lima.getUTCDate())}/${dosDigitos(lima.getUTCMonth() + 1)}`;
  const hora = `${dosDigitos(lima.getUTCHours())}:${dosDigitos(lima.getUTCMinutes())}`;
  const consultorio = a.consultorio.replace(/^Consultorio/i, 'Cons.');
  const texto = `Hampi: cita ${a.codigo}, ${a.especialidad}, ${a.establecimiento}, ${fecha} ${hora}, ${consultorio}. Llega 20 min antes con tu DNI.`;
  return sinTildes(texto).slice(0, 160);
}

export class SmsNotificadorAdapter implements Notificador {
  constructor(private readonly sms: ClienteSms) {}

  citaReservada(aviso: AvisoCita) {
    return this.sms.enviar(aviso.celular, textoSmsCita(aviso));
  }
}

export class QrPngAdapter implements GeneradorQR {
  generar(contenido: string) {
    return QRCode.toDataURL(contenido, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
  }
}
