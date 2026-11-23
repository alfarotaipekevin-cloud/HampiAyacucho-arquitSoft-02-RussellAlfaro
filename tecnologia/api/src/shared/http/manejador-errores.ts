import { ErrorRequestHandler } from 'express';
import { ErrorAplicacion, TipoError } from '../dominio/errores';

const ESTADO_HTTP: Record<TipoError, number> = {
  DATOS_INVALIDOS: 400,
  NO_AUTENTICADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  REGLA_NEGOCIO: 409,
  BLOQUEADO: 423,
  VENCIDO: 410,
  DEMASIADOS_INTENTOS: 429,
  SERVICIO_EXTERNO: 503,
};

/** Traduce los errores de la aplicación al formato común de la constitución (§4). */
export const manejadorErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErrorAplicacion) {
    res.status(ESTADO_HTTP[error.tipo]).json({
      error: { codigo: error.codigo, mensaje: error.message, ...error.detalles },
    });
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'DATOS_INVALIDOS', mensaje: 'El cuerpo de la petición no es JSON válido' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' } });
};
