import { createClient } from 'redis';
import { Cache, ContadoresCache } from '../dominio/cache';

/**
 * Caché distribuida Redis compartida por todas las instancias de la API (ADR-004).
 * Si Redis no responde, las operaciones lanzan error enseguida (sin cola offline)
 * y el decorador de cupos lee de la base de datos: la caché nunca tumba la API (EQ-02).
 */
export class CacheRedis implements Cache {
  readonly tipo = 'redis' as const;
  private readonly contadores = new ContadoresCache();
  private readonly cliente;

  constructor(url: string, private readonly prefijo = 'hampi:') {
    this.cliente = createClient({
      url,
      disableOfflineQueue: true,
      socket: { connectTimeout: 2000, reconnectStrategy: (intento) => Math.min(intento * 200, 5000) },
    });
    this.cliente.on('error', (e) => {
      this.contadores.errores++;
      if (this.contadores.errores % 100 === 1) console.warn(`Redis no disponible (${e.message}); se usa la base de datos.`);
    });
  }

  async conectar() {
    try {
      await this.cliente.connect();
    } catch (e) {
      console.warn(`No se pudo conectar a Redis (${(e as Error).message}); se seguirá reintentando.`);
    }
    return this;
  }

  async obtener<T>(clave: string): Promise<T | null> {
    const valor = await this.conRegistro(() => this.cliente.get(this.prefijo + clave));
    if (valor == null) {
      this.contadores.fallos++;
      return null;
    }
    this.contadores.aciertos++;
    return JSON.parse(valor) as T;
  }

  async guardar<T>(clave: string, valor: T, ttlSegundos: number) {
    await this.conRegistro(() => this.cliente.set(this.prefijo + clave, JSON.stringify(valor), { EX: ttlSegundos }));
  }

  async borrar(...claves: string[]) {
    if (!claves.length) return;
    await this.conRegistro(() => this.cliente.del(claves.map((c) => this.prefijo + c)));
    this.contadores.invalidaciones += claves.length;
  }

  estadisticas() {
    return this.contadores.resumen(this.tipo);
  }

  async cerrar() {
    if (this.cliente.isOpen) await this.cliente.quit();
  }

  private async conRegistro<R>(operacion: () => Promise<R>): Promise<R> {
    try {
      return await operacion();
    } catch (e) {
      this.contadores.errores++;
      throw e;
    }
  }
}
