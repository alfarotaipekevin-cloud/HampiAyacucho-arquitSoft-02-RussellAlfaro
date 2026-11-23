import { Usuario } from './usuario';

/** Puerto de persistencia de cuentas. */
export interface RepositorioUsuarios {
  buscarPorDni(dni: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  /** Inserta una cuenta nueva; si el DNI ya tiene cuenta lanza CUENTA_EXISTENTE (RI-04). */
  crear(usuario: Usuario): Promise<void>;
  actualizar(usuario: Usuario): Promise<void>;
}
