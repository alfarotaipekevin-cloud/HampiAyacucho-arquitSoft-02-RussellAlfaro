import { Cache, ContadoresCache } from '../dominio/cache';

/** Caché local de un solo proceso. Se usa en pruebas y cuando no hay REDIS_URL. */
export class CacheMemoria implements Cache {
  readonly tipo = 'memoria' as const;
  private readonly datos = new Map<string, { valor: string; venceEn: number }>();
  private readonly contadores = new ContadoresCache();

  constructor(private readonly ahoraMs: () => number = Date.now) {}

  async obtener<T>(clave: string): Promise<T | null> {
    const entrada = this.datos.get(clave);
    if (!entrada || entrada.venceEn <= this.ahoraMs()) {
      this.datos.delete(clave);
      this.contadores.fallos++;
      return null;
    }
    this.contadores.aciertos++;
    return JSON.parse(entrada.valor) as T;
  }

  async guardar<T>(clave: string, valor: T, ttlSegundos: number) {
    // Se guarda serializado, igual que en Redis, para no compartir referencias mutables.
    this.datos.set(clave, { valor: JSON.stringify(valor), venceEn: this.ahoraMs() + ttlSegundos * 1000 });
  }

  async borrar(...claves: string[]) {
    for (const c of claves) this.datos.delete(c);
    this.contadores.invalidaciones += claves.length;
  }

  estadisticas() {
    return this.contadores.resumen(this.tipo);
  }
}

/** Sin caché: todas las lecturas van a la base de datos. Sirve para comparar en las pruebas de carga. */
export class SinCache implements Cache {
  readonly tipo = 'desactivada' as const;
  private readonly contadores = new ContadoresCache();
  async obtener<T>(): Promise<T | null> {
    this.contadores.fallos++;
    return null;
  }
  async guardar() {}
  async borrar() {}
  estadisticas() {
    return this.contadores.resumen(this.tipo);
  }
}
