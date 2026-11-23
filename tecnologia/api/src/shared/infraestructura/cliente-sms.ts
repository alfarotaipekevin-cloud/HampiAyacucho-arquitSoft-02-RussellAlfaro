// Cliente HTTP del proveedor de SMS (o de su simulador, spec 001).

export interface ConfiguracionSms {
  url: string;
  apiKey: string;
  tiempoMaximoMs?: number;
}

export class ClienteSms {
  constructor(private readonly config: ConfiguracionSms) {}

  /** Devuelve true si el proveedor aceptó el mensaje. Nunca lanza: un SMS fallido no debe romper el flujo. */
  async enviar(celular: string, texto: string): Promise<boolean> {
    try {
      const respuesta = await fetch(`${this.config.url}/v1/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({ telefono: `+51${celular}`, texto }),
        signal: AbortSignal.timeout(this.config.tiempoMaximoMs ?? 5000),
      });
      return respuesta.status === 202;
    } catch {
      return false;
    }
  }
}
