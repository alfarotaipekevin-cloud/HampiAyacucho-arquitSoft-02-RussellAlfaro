import { ReglaNegocioError } from '../../../shared/dominio/errores';

export type EstadoCupo = 'DISPONIBLE' | 'OCUPADO';

export interface DatosCupo {
  id: string;
  establecimientoId: string;
  especialidadId: string;
  consultorio: string;
  medico: string;
  fechaHora: Date;
  duracionMin: number;
  estado: EstadoCupo;
}

/** Entidad: horario de atención de una especialidad en un establecimiento. */
export class Cupo {
  constructor(private datos: DatosCupo) {}

  get id() { return this.datos.id; }
  get establecimientoId() { return this.datos.establecimientoId; }
  get especialidadId() { return this.datos.especialidadId; }
  get consultorio() { return this.datos.consultorio; }
  get medico() { return this.datos.medico; }
  get fechaHora() { return this.datos.fechaHora; }

  estaDisponible(): boolean {
    return this.datos.estado === 'DISPONIBLE';
  }

  /** RN-01: solo se ocupa un cupo disponible. */
  ocupar(): void {
    if (!this.estaDisponible()) {
      throw new ReglaNegocioError('CUPO_NO_DISPONIBLE', 'RN-01: el cupo ya no está disponible');
    }
    this.datos.estado = 'OCUPADO';
  }

  liberar(): void {
    this.datos.estado = 'DISPONIBLE';
  }

  instantanea(): DatosCupo {
    return { ...this.datos };
  }
}
