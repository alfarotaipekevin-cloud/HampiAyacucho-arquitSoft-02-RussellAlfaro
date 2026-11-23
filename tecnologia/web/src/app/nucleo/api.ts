import { HttpErrorResponse } from '@angular/common/http';
import { TEXTOS } from './textos';

declare global {
  interface Window {
    __HAMPI_API__?: string;
  }
}

/**
 * URL de la API. Se puede cambiar sin recompilar editando `public/configuracion.js`
 * (en Vercel se sirve tal cual y apunta al servicio de Render).
 */
export const API = (globalThis.window?.__HAMPI_API__ ?? 'http://localhost:3000') + '/api/v1';

/** Mensaje que la API envía en `{error:{codigo, mensaje}}`; si no hay, uno genérico. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return TEXTOS.errores.red;
    const mensaje = e.error?.error?.mensaje;
    if (typeof mensaje === 'string' && mensaje.length > 0) return mensaje;
  }
  return TEXTOS.errores.generico;
}

/** Código de negocio del error (CUPO_NO_DISPONIBLE, CODIGO_VENCIDO, ...). */
export function codigoDeError(e: unknown): string | null {
  return e instanceof HttpErrorResponse && typeof e.error?.error?.codigo === 'string' ? e.error.error.codigo : null;
}
