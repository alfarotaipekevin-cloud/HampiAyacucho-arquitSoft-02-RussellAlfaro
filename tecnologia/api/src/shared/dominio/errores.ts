/**
 * Errores de la aplicación. El dominio indica el TIPO de error (qué pasó);
 * la capa de presentación decide el código HTTP (shared/http/manejador-errores.ts).
 */
export type TipoError =
  | 'DATOS_INVALIDOS'
  | 'NO_AUTENTICADO'
  | 'PROHIBIDO'
  | 'NO_ENCONTRADO'
  | 'REGLA_NEGOCIO'
  | 'BLOQUEADO'
  | 'VENCIDO'
  | 'DEMASIADOS_INTENTOS'
  | 'SERVICIO_EXTERNO';

export class ErrorAplicacion extends Error {
  constructor(
    readonly tipo: TipoError,
    readonly codigo: string,
    mensaje: string,
    readonly detalles?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = 'ErrorAplicacion';
  }
}

/** Regla de negocio incumplida (RN-xx, RI-xx). */
export class ReglaNegocioError extends ErrorAplicacion {
  constructor(codigo: string, mensaje: string, detalles?: Record<string, unknown>) {
    super('REGLA_NEGOCIO', codigo, mensaje, detalles);
  }
}

export class DatosInvalidosError extends ErrorAplicacion {
  constructor(mensaje: string, codigo = 'DATOS_INVALIDOS') {
    super('DATOS_INVALIDOS', codigo, mensaje);
  }
}

export class NoEncontradoError extends ErrorAplicacion {
  constructor(codigo: string, mensaje: string) {
    super('NO_ENCONTRADO', codigo, mensaje);
  }
}

/** Un servicio externo (PIDE, SMS) no respondió. */
export class ServicioExternoError extends ErrorAplicacion {
  constructor(codigo: string, mensaje: string) {
    super('SERVICIO_EXTERNO', codigo, mensaje);
  }
}
