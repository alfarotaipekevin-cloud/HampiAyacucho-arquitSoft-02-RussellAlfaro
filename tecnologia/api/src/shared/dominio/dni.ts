import { DatosInvalidosError } from './errores';

/** Objeto de valor compartido por Identidad y Citas (RN-00 / RI-01): DNI de 8 dígitos. */
export class Dni {
  readonly valor: string;

  constructor(valor: unknown) {
    if (typeof valor !== 'string' || !/^\d{8}$/.test(valor)) {
      throw new DatosInvalidosError('RN-00: el DNI debe tener 8 dígitos');
    }
    this.valor = valor;
  }
}
