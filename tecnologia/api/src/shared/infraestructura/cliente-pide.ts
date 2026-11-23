import { ServicioExternoError } from '../dominio/errores';
import { PersonaRegistroCivil, ResultadoConsultaDni } from '../dominio/registro-civil';

// Cliente HTTP del servicio de consulta de DNI de la PIDE (o de su simulador, spec 001).

export interface ConfiguracionPide {
  url: string;
  usuario: string;
  password: string;
  tiempoMaximoMs?: number;
}

const capitalizar = (texto: string) =>
  texto.toLowerCase().replace(/(^|\s)\p{L}/gu, (letra) => letra.toUpperCase());

export class ClientePide {
  constructor(private readonly config: ConfiguracionPide) {}

  async consultarDni(dni: string): Promise<ResultadoConsultaDni> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.config.url}/reniec/consulta-dni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuDniConsulta: dni, nuDniUsuario: this.config.usuario, password: this.config.password }),
        signal: AbortSignal.timeout(this.config.tiempoMaximoMs ?? 5000),
      });
    } catch {
      throw this.noDisponible();
    }
    if (!respuesta.ok) throw this.noDisponible();

    const cuerpo = await respuesta.json();
    if (cuerpo.coResultado === '0001') return { estado: 'NO_EXISTE' };
    if (cuerpo.coResultado !== '0000' && cuerpo.coResultado !== '0002') throw this.noDisponible();

    const d = cuerpo.datosPersona;
    const persona: PersonaRegistroCivil = {
      dni: d.nuDni,
      nombres: capitalizar(d.prenombres),
      apellidoPaterno: capitalizar(d.apPrimer),
      apellidoMaterno: capitalizar(d.apSegundo),
      fechaNacimiento: d.feNacimiento,
    };
    return cuerpo.coResultado === '0002'
      ? { estado: 'RESTRINGIDO', motivo: d.restriccion, persona }
      : { estado: 'VALIDO', persona };
  }

  private noDisponible() {
    return new ServicioExternoError(
      'SERVICIO_IDENTIDAD_NO_DISPONIBLE',
      'No pudimos validar tu identidad con RENIEC en este momento. Intenta nuevamente en unos minutos.',
    );
  }
}
