import { Dni } from './dni';

/** Puerto hacia la PIDE / RENIEC. El dominio no sabe que existe la PIDE. */
export interface ValidadorIdentidad {
  validar(dni: Dni): Promise<boolean>;
}
