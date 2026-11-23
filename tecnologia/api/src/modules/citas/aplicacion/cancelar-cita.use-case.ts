import { NoEncontradoError } from '../../../shared/dominio/errores';
import { Reloj } from '../../../shared/dominio/reloj';
import { RepositorioCitas } from '../dominio/repositorios';

/** Cancelar una cita propia (spec 005, Debería · RN-03 y RN-15). El cupo vuelve a estar disponible. */
export class CancelarCitaUseCase {
  constructor(
    private readonly citas: RepositorioCitas,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(pacienteId: string, citaId: string) {
    const cita = await this.citas.buscarPorId(citaId);
    if (!cita || !cita.perteneceA(pacienteId)) throw new NoEncontradoError('CITA_NO_EXISTE', 'La cita no existe');
    cita.cancelar(this.reloj.ahora());
    await this.citas.actualizar(cita);
    return { citaId: cita.id, codigo: cita.codigo, estado: cita.estado };
  }
}
