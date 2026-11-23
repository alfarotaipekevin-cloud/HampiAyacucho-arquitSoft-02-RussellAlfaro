import { RequestHandler, Router } from 'express';
import { usuarioDe } from '../../../shared/http/peticion';
import { CatalogoModulos } from '../aplicacion/catalogo-modulos';

/** GET /api/v1/portal/modulos (spec 003, §5). */
export function crearRutasPortal(catalogo: CatalogoModulos, autenticar: RequestHandler): Router {
  const rutas = Router();
  rutas.get('/modulos', autenticar, (req, res) => {
    const usuario = usuarioDe(req);
    res.json({ usuario: { nombre: usuario.nombre, rol: usuario.rol }, modulos: catalogo.paraRol(usuario.rol) });
  });
  return rutas;
}
