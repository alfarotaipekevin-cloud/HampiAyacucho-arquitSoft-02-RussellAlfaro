import { ReglaNegocioError } from '../../../shared/errores';
import { Cita } from '../dominio/cita';
import { Dni } from '../dominio/dni';
import { Notificador } from '../dominio/notificador';
import { RepositorioCitas } from '../dominio/repositorio-citas';
import { RepositorioCupos } from '../dominio/repositorio-cupos';
import { ValidadorIdentidad } from '../dominio/validador-identidad';
import { CitaReservada, ReservarCitaCommand } from './reservar-cita.command';

/** Caso de uso HU02 / RF02-RF03: coordina los pasos; las reglas viven en la entidad Cita. */
export class ReservarCitaUseCase {
  constructor(
    private readonly citas: RepositorioCitas,          // interfaz, no PostgreSQL
    private readonly cupos: RepositorioCupos,          // interfaz, no Redis
    private readonly identidad: ValidadorIdentidad,    // interfaz, no PIDE
    private readonly notificador: Notificador,         // interfaz, no proveedor SMS
  ) {}

  async ejecutar(cmd: ReservarCitaCommand): Promise<CitaReservada> {
    const dni = new Dni(cmd.dni);
    if (!(await this.identidad.validar(dni))) {
      throw new ReglaNegocioError('El DNI no fue validado por RENIEC');
    }

    const cupo = await this.cupos.buscarPorId(cmd.cupoId);
    if (!cupo) throw new ReglaNegocioError('El cupo solicitado no existe');

    const duplicada = await this.citas.existeEnEspecialidadYDia(dni, cupo);
    const cita = Cita.reservar(dni, cupo, duplicada);

    await this.citas.guardar(cita);
    await this.cupos.guardar(cupo); // marca el cupo como ocupado e invalida la caché
    await this.notificador.citaReservada(cita);

    return {
      citaId: cita.id,
      codigoQR: cita.codigoQR,
      especialidad: cupo.especialidad,
      establecimiento: cupo.establecimiento,
      fechaHora: cupo.fechaHora.toISOString(),
    };
  }
}
