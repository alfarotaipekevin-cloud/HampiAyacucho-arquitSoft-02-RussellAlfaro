// API pública del módulo Identidad: lo único que otros módulos y app.ts pueden importar.
export { crearModuloIdentidad } from './identidad.module';
export type { ModuloIdentidad, DependenciasIdentidad } from './identidad.module';
export type { PerfilUsuario } from './aplicacion/consultar-perfil.use-case';
export { UsuariosMemoriaRepository } from './infraestructura/usuarios-memoria.repository';
export { UsuariosPostgresRepository } from './infraestructura/usuarios-postgres.repository';
export { HasheadorBcrypt } from './infraestructura/hasheador-bcrypt';
export { EmisorJwt } from './infraestructura/emisor-jwt';
export { RegistroCivilPideAdapter } from './infraestructura/registro-civil-pide.adapter';
export { CodigosMemoriaRepository, CodigosPostgresRepository } from './infraestructura/codigos.repositories';
export { SmsMensajeroAdapter } from './infraestructura/sms-mensajero.adapter';
export type { MensajeroIdentidad } from './dominio/codigo-recuperacion';
export { Usuario } from './dominio/usuario';
