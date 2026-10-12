import { Cupo } from '../dominio/cupo';
import { RepositorioCupos } from '../dominio/repositorio-cupos';

/** Simula la tabla de cupos de PostgreSQL. */
export class CuposMemoriaRepository implements RepositorioCupos {
  consultas = 0; // para comprobar en las pruebas que la caché evita consultas

  constructor(private readonly cupos = new Map<string, Cupo>()) {}

  async buscarPorId(id: string): Promise<Cupo | null> {
    this.consultas++;
    return this.cupos.get(id) ?? null;
  }

  async guardar(cupo: Cupo): Promise<void> {
    this.cupos.set(cupo.id, cupo);
  }
}
