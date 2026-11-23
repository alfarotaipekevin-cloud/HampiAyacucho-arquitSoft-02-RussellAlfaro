import { RequestHandler } from 'express';
import { CatalogoModulos, MODULOS_PLANIFICADOS } from './aplicacion/catalogo-modulos';
import { TarjetaModulo } from './dominio/tarjeta-modulo';
import { crearRutasPortal } from './presentacion/portal.routes';

/** Raíz de composición del Portal. Recibe las tarjetas de los módulos ya construidos. */
export function crearModuloPortal(tarjetasActivas: TarjetaModulo[], autenticar: RequestHandler) {
  const catalogo = new CatalogoModulos();
  [...MODULOS_PLANIFICADOS, ...tarjetasActivas].forEach((t) => catalogo.registrar(t));
  return { rutas: crearRutasPortal(catalogo, autenticar) };
}
