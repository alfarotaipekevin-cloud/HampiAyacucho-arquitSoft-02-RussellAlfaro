/**
 * Puerto de caché (ADR-004). Los casos de uso no saben si detrás hay Redis o memoria:
 * la implementación se elige en infraestructura.ts (inversión de dependencias, SOLID-D).
 */
export interface Cache {
  readonly tipo: 'redis' | 'memoria' | 'desactivada';
  obtener<T>(clave: string): Promise<T | null>;
  guardar<T>(clave: string, valor: T, ttlSegundos: number): Promise<void>;
  borrar(...claves: string[]): Promise<void>;
  estadisticas(): EstadisticasCache;
  cerrar?(): Promise<void>;
}

export interface EstadisticasCache {
  tipo: Cache['tipo'];
  aciertos: number;
  fallos: number;
  errores: number;
  invalidaciones: number;
  /** aciertos / (aciertos + fallos), de 0 a 1. */
  tasaAciertos: number;
}

/** Contadores comunes a todas las implementaciones. */
export class ContadoresCache {
  aciertos = 0;
  fallos = 0;
  errores = 0;
  invalidaciones = 0;

  resumen(tipo: Cache['tipo']): EstadisticasCache {
    const total = this.aciertos + this.fallos;
    return {
      tipo, aciertos: this.aciertos, fallos: this.fallos, errores: this.errores, invalidaciones: this.invalidaciones,
      tasaAciertos: total ? Number((this.aciertos / total).toFixed(4)) : 0,
    };
  }
}
