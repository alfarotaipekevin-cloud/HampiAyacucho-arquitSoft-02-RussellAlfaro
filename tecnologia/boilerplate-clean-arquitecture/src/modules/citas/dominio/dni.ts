import { ReglaNegocioError } from '../../../shared/errores';

/** Objeto de valor: un DNI peruano válido tiene exactamente 8 dígitos. */
export class Dni {
  readonly valor: string;

  constructor(valor: string) {
    if (!/^\d{8}$/.test(valor)) {
      throw new ReglaNegocioError('RN-00: el DNI debe tener 8 dígitos');
    }
    this.valor = valor;
  }
}
