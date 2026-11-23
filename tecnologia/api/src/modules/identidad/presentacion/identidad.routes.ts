import { RequestHandler, Router } from 'express';
import { usuarioDe } from '../../../shared/http/peticion';
import { ConsultarPerfilUseCase } from '../aplicacion/consultar-perfil.use-case';
import { IniciarSesionUseCase } from '../aplicacion/iniciar-sesion.use-case';
import { RecuperarContrasenaUseCase } from '../aplicacion/recuperar-contrasena.use-case';
import { RegistrarUsuarioUseCase } from '../aplicacion/registrar-usuario.use-case';
import { VerificarIdentidadUseCase } from '../aplicacion/verificar-identidad.use-case';

interface CasosDeUso {
  verificarIdentidad: VerificarIdentidadUseCase;
  registrarUsuario: RegistrarUsuarioUseCase;
  iniciarSesion: IniciarSesionUseCase;
  consultarPerfil: ConsultarPerfilUseCase;
  recuperarContrasena: RecuperarContrasenaUseCase;
}

/** Rutas /api/v1/identidad (spec 002, §5). */
export function crearRutasIdentidad(casos: CasosDeUso, autenticar: RequestHandler): Router {
  const rutas = Router();

  rutas.post('/registro/verificar', async (req, res) => {
    const persona = await casos.verificarIdentidad.ejecutar(req.body ?? {});
    res.json({ nombreCompleto: `${persona.nombres} ${persona.apellidoPaterno} ${persona.apellidoMaterno}` });
  });

  rutas.post('/registro', async (req, res) => {
    res.status(201).json(await casos.registrarUsuario.ejecutar(req.body ?? {}));
  });

  rutas.post('/sesion', async (req, res) => {
    res.json(await casos.iniciarSesion.ejecutar(req.body ?? {}));
  });

  rutas.post('/recuperacion', async (req, res) => {
    res.status(202).json(await casos.recuperarContrasena.solicitar(req.body ?? {}));
  });

  rutas.post('/recuperacion/confirmar', async (req, res) => {
    await casos.recuperarContrasena.confirmar(req.body ?? {});
    res.status(204).end();
  });

  rutas.get('/yo', autenticar, async (req, res) => {
    res.json(await casos.consultarPerfil.ejecutar(usuarioDe(req).id));
  });

  return rutas;
}
