import { Reloj } from '../../shared/dominio/reloj';
import { ConsultarPerfilUseCase } from './aplicacion/consultar-perfil.use-case';
import { IniciarSesionUseCase } from './aplicacion/iniciar-sesion.use-case';
import { RecuperarContrasenaUseCase } from './aplicacion/recuperar-contrasena.use-case';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-usuario.use-case';
import { MensajeroIdentidad, RepositorioCodigos } from './dominio/codigo-recuperacion';
import { VerificarIdentidadUseCase } from './aplicacion/verificar-identidad.use-case';
import { EmisorTokens } from './dominio/emisor-tokens';
import { Hasheador } from './dominio/hasheador';
import { RegistroCivil } from './dominio/registro-civil';
import { RepositorioUsuarios } from './dominio/repositorio-usuarios';
import { crearRutasIdentidad } from './presentacion/identidad.routes';
import { autorizarRol, crearAutenticarJwt } from './presentacion/middlewares';

export interface DependenciasIdentidad {
  usuarios: RepositorioUsuarios;
  codigos: RepositorioCodigos;
  mensajero: MensajeroIdentidad;
  registroCivil: RegistroCivil;
  hasheador: Hasheador;
  emisor: EmisorTokens;
  reloj: Reloj;
}

/** Raíz de composición del módulo Identidad. */
export function crearModuloIdentidad(d: DependenciasIdentidad) {
  const verificarIdentidad = new VerificarIdentidadUseCase(d.registroCivil);
  const consultarPerfil = new ConsultarPerfilUseCase(d.usuarios);
  const autenticarJwt = crearAutenticarJwt(d.emisor);

  const rutas = crearRutasIdentidad(
    {
      verificarIdentidad,
      registrarUsuario: new RegistrarUsuarioUseCase(d.usuarios, verificarIdentidad, d.hasheador),
      iniciarSesion: new IniciarSesionUseCase(d.usuarios, d.hasheador, d.emisor, d.reloj),
      consultarPerfil,
      recuperarContrasena: new RecuperarContrasenaUseCase(d.usuarios, d.codigos, d.mensajero, d.hasheador, d.reloj),
    },
    autenticarJwt,
  );

  return {
    rutas,
    autenticarJwt,
    autorizarRol,
    /** Lo que otros módulos pueden pedir a Identidad sin leer sus tablas (constitución, P3). */
    consultarPerfil: (usuarioId: string) => consultarPerfil.ejecutar(usuarioId),
  };
}

export type ModuloIdentidad = ReturnType<typeof crearModuloIdentidad>;
