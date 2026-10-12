import { Cupo } from './cupo';

export interface RepositorioCupos {
  buscarPorId(id: string): Promise<Cupo | null>;
  guardar(cupo: Cupo): Promise<void>;
}
