import { RequestHandler } from 'express';
import { ErrorAplicacion } from '../../../shared/dominio/errores';
import { Rol } from '../../../shared/dominio/usuario-autenticado';
import { EmisorTokens } from '../dominio/emisor-tokens';

/** Valida "Authorization: Bearer <token>" y deja el usuario en req.usuario (spec 002, §5.5). */
export const crearAutenticarJwt = (emisor: EmisorTokens): RequestHandler => (req, _res, next) => {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  const usuario = esquema === 'Bearer' && token ? emisor.verificar(token) : null;
  if (!usuario) {
    throw new ErrorAplicacion('NO_AUTENTICADO', 'SESION_REQUERIDA', 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
  }
  req.usuario = usuario;
  next();
};

/** Permite continuar solo a los roles indicados; si no, 403 ROL_NO_AUTORIZADO. */
export const autorizarRol = (...roles: Rol[]): RequestHandler => (req, _res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) {
    throw new ErrorAplicacion('PROHIBIDO', 'ROL_NO_AUTORIZADO', 'No tienes permiso para esta operación');
  }
  next();
};
