import { Cita } from '../dominio/cita';
import { Cupo } from '../dominio/cupo';
import { Dni } from '../dominio/dni';
import { EstadoCita } from '../dominio/estado-cita';
import { RepositorioCitas } from '../dominio/repositorio-citas';

/**
 * Implementación en memoria para pruebas y demo.
 * En producción se reemplaza por CitasPostgresRepository sin tocar el dominio.
 */
export class CitasMemoriaRepository implements RepositorioCitas {
  private readonly citas = new Map<string, Cita>();

  async guardar(cita: Cita): Promise<void> {
    this.citas.set(cita.id, cita);
  }

  async existeEnEspecialidadYDia(dni: Dni, cupo: Cupo): Promise<boolean> {
    const dia = cupo.fechaHora.toDateString();
    return [...this.citas.values()].some(
      (c) =>
        c.dniPaciente.valor === dni.valor &&
        c.cupo.especialidad === cupo.especialidad &&
        c.cupo.fechaHora.toDateString() === dia &&
        c.obtenerEstado() !== EstadoCita.CANCELADA,
    );
  }
}
