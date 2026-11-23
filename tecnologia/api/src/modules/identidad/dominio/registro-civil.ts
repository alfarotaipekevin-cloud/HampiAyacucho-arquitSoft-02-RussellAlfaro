import { Dni } from '../../../shared/dominio/dni';
import { ResultadoConsultaDni } from '../../../shared/dominio/registro-civil';

/** Puerto hacia RENIEC (vía PIDE) para validar la identidad al crear la cuenta (RI-02, RI-03). */
export interface RegistroCivil {
  consultar(dni: Dni): Promise<ResultadoConsultaDni>;
}
