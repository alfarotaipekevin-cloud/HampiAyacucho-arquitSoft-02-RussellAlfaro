import { randomInt } from 'node:crypto';

/** Código de un solo uso para cambiar la contraseña (RI-11). */
export interface CodigoRecuperacion {
  usuarioId: string;
  hashCodigo: string;
  expiraEn: Date;
  intentos: number;
}

export const MINUTOS_VIGENCIA_CODIGO = 10;
export const MAX_INTENTOS_CODIGO = 3;

export function generarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Puerto de persistencia: un código vigente por usuario (uno nuevo reemplaza al anterior). */
export interface RepositorioCodigos {
  guardar(codigo: CodigoRecuperacion): Promise<void>;
  buscar(usuarioId: string): Promise<CodigoRecuperacion | null>;
  eliminar(usuarioId: string): Promise<void>;
}

/** Puerto hacia el SMS para enviar el código. Devuelve false si no se pudo enviar. */
export interface MensajeroIdentidad {
  enviarCodigo(celular: string, codigo: string): Promise<boolean>;
}
