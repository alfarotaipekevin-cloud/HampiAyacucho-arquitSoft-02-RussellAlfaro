/** Puerto para obtener la hora actual; las pruebas usan un reloj fijo. */
export interface Reloj {
  ahora(): Date;
}

export const relojDelSistema: Reloj = { ahora: () => new Date() };
