import { ReglaNegocioError } from '../../../shared/errores';

/** Entidad: horario de una especialidad en un establecimiento de salud. */
export class Cupo {
  constructor(
    readonly id: string,
    readonly especialidad: string,
    readonly establecimiento: string,
    readonly fechaHora: Date,
    private disponible: boolean = true,
  ) {}

  estaDisponible(): boolean {
    return this.disponible;
  }

  ocupar(): void {
    if (!this.disponible) {
      throw new ReglaNegocioError('RN-01: el cupo ya no está disponible');
    }
    this.disponible = false;
  }

  liberar(): void {
    this.disponible = true;
  }
}
