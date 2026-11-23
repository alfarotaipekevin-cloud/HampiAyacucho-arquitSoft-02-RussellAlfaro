import { Injectable, computed, signal } from '@angular/core';
import { Sesion, SesionGuardada } from './modelos';

const CLAVE_SESION = 'hampi.sesion';
/** RI-10: "Recordar cuenta" guarda solo el número de documento, nunca la contraseña. */
const CLAVE_DOCUMENTO = 'hampi.documento';

/** Guarda la sesión del usuario en el navegador y avisa a quien la observe. */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly estado = signal<SesionGuardada | null>(this.leer());

  readonly sesion = this.estado.asReadonly();
  readonly usuario = computed(() => this.estado()?.usuario ?? null);
  readonly haySesion = computed(() => this.estado() !== null);

  get token(): string | null {
    return this.estado()?.token ?? null;
  }

  guardar(sesion: Sesion): void {
    // `expiraEn` llega en segundos; se guarda como fecha para saber si sigue vigente al recargar.
    const guardada: SesionGuardada = { ...sesion, venceEn: new Date(Date.now() + sesion.expiraEn * 1000).toISOString() };
    this.estado.set(guardada);
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(guardada));
    } catch {
      /* modo privado */
    }
  }

  cerrar(): void {
    this.estado.set(null);
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      /* modo privado */
    }
  }

  /** Documento recordado, para rellenar el campo del ingreso. */
  get documentoRecordado(): string {
    try {
      return localStorage.getItem(CLAVE_DOCUMENTO) ?? '';
    } catch {
      return '';
    }
  }

  recordarDocumento(documento: string, recordar: boolean): void {
    try {
      if (recordar) localStorage.setItem(CLAVE_DOCUMENTO, documento);
      else localStorage.removeItem(CLAVE_DOCUMENTO);
    } catch {
      /* modo privado */
    }
  }

  private leer(): SesionGuardada | null {
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as SesionGuardada;
      return new Date(sesion.venceEn) > new Date() ? sesion : null;
    } catch {
      return null;
    }
  }
}
