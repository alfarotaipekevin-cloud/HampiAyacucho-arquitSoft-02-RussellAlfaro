/** Error de una regla de negocio del dominio (se responde 409/422, no 500). */
export class ReglaNegocioError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ReglaNegocioError';
  }
}
