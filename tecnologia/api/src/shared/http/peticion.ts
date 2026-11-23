import { Request } from 'express';
import { ErrorAplicacion } from '../dominio/errores';
import { UsuarioAutenticado } from '../dominio/usuario-autenticado';

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}

/** Usuario que dejó el middleware autenticarJwt; si no hay, la ruta no estaba protegida. */
export function usuarioDe(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw new ErrorAplicacion('NO_AUTENTICADO', 'SESION_REQUERIDA', 'Debes iniciar sesión');
  return req.usuario;
}
