import { Cita } from './cita';
import { Cupo } from './cupo';
import { Dni } from './dni';

/** Puerto de salida: qué necesita el módulo para persistir citas (no cómo). */
export interface RepositorioCitas {
  guardar(cita: Cita): Promise<void>;
  existeEnEspecialidadYDia(dni: Dni, cupo: Cupo): Promise<boolean>;
}
