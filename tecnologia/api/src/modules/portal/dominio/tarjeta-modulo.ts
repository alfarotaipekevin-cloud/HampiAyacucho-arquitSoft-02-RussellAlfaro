import { Rol } from '../../../shared/dominio/usuario-autenticado';

/** Tarjeta que un módulo muestra en el portal de inicio (spec 003). */
export interface TarjetaModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  estado: 'ACTIVO' | 'PROXIMAMENTE';
  ruta: string;
  roles: Rol[];
}
