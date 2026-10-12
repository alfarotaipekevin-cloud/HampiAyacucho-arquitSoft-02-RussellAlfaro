import { Cupo } from '../dominio/cupo';
import { RepositorioCupos } from '../dominio/repositorio-cupos';

/**
 * Patrón Decorator: envuelve otro RepositorioCupos y agrega caché.
 * Aquí la caché es un Map; en producción sería Redis (CuposRedisCacheRepository).
 */
export class CuposCacheRepository implements RepositorioCupos {
  private readonly cache = new Map<string, Cupo>();

  constructor(private readonly origen: RepositorioCupos) {}

  async buscarPorId(id: string): Promise<Cupo | null> {
    const enCache = this.cache.get(id);
    if (enCache) return enCache;
    const cupo = await this.origen.buscarPorId(id);
    if (cupo) this.cache.set(id, cupo);
    return cupo;
  }

  async guardar(cupo: Cupo): Promise<void> {
    await this.origen.guardar(cupo);
    this.cache.delete(cupo.id); // invalida para no mostrar cupos ocupados
  }
}
