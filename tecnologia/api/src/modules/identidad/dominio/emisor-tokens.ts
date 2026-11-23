import { UsuarioAutenticado } from '../../../shared/dominio/usuario-autenticado';

/** Puerto para emitir y verificar la sesión (RI-09). */
export interface EmisorTokens {
  emitir(usuario: UsuarioAutenticado): { token: string; expiraEn: number };
  verificar(token: string): UsuarioAutenticado | null;
}
