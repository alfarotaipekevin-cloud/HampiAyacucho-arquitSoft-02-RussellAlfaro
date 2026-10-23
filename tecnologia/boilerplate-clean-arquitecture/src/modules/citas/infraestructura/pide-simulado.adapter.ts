import { Dni } from '../dominio/dni';
import { ValidadorIdentidad } from '../dominio/validador-identidad';

/**
 * Patrón Adapter (versión simulada). El adaptador real (PideAdapter) traduciría
 * validar(dni) a la llamada HTTPS del servicio de RENIEC en la PIDE.
 */
export class PideSimuladoAdapter implements ValidadorIdentidad {
  constructor(private readonly dnisRegistrados: string[]) {}

  async validar(dni: Dni): Promise<boolean> {
    return this.dnisRegistrados.includes(dni.valor);
  }
}
