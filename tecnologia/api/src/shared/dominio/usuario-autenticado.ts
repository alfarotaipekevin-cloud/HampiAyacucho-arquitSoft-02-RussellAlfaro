/** Datos del usuario que viajan en el token y que los módulos leen de la petición. */
export type Rol = 'PACIENTE' | 'PERSONAL_SALUD' | 'ESPECIALISTA_GERESA' | 'ADMINISTRADOR';

export const ROLES: readonly Rol[] = ['PACIENTE', 'PERSONAL_SALUD', 'ESPECIALISTA_GERESA', 'ADMINISTRADOR'];

export interface UsuarioAutenticado {
  id: string;
  dni: string;
  nombre: string;
  rol: Rol;
}
