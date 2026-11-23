import { Dni } from '../../../shared/dominio/dni';
import { DatosInvalidosError, NoEncontradoError, ReglaNegocioError } from '../../../shared/dominio/errores';
import { diaEnLima } from '../../../shared/dominio/fecha-lima';
import { Reloj } from '../../../shared/dominio/reloj';
import { Cita } from '../dominio/cita';
import { RepositorioCatalogo, RepositorioCitas, RepositorioCupos } from '../dominio/repositorios';
import { DirectorioPacientes, Notificador, ValidadorIdentidad } from '../dominio/servicios-externos';
import { ConstructorFicha, FichaCita } from './ficha-cita';

export interface ReservarCitaCommand {
  pacienteId: string;
  dni: string; // viene del token, no del formulario (spec 005, §1)
  cupoId: unknown;
}

/** HU02 · RF02, RF03 · spec 005. Mismo flujo que el diagrama de secuencia del diseño interno. */
export class ReservarCitaUseCase {
  constructor(
    private readonly citas: RepositorioCitas,
    private readonly cupos: RepositorioCupos,
    private readonly catalogo: RepositorioCatalogo,
    private readonly identidad: ValidadorIdentidad,
    private readonly notificador: Notificador,
    private readonly pacientes: DirectorioPacientes,
    private readonly ficha: ConstructorFicha,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(cmd: ReservarCitaCommand): Promise<FichaCita> {
    if (typeof cmd.cupoId !== 'string' || cmd.cupoId === '') throw new DatosInvalidosError('cupoId es obligatorio');
    const dni = new Dni(cmd.dni);

    // RN-14: si RENIEC no responde, el validador lanza 503 y no se toca el cupo.
    if (!(await this.identidad.esVigente(dni))) {
      throw new ReglaNegocioError('IDENTIDAD_NO_VALIDA', 'Tu DNI no está vigente en RENIEC');
    }

    const cupo = await this.cupos.buscarPorId(cmd.cupoId);
    if (!cupo) throw new NoEncontradoError('CUPO_NO_EXISTE', 'El cupo solicitado no existe');

    const ahora = this.reloj.ahora();
    const [duplicada, reservadas] = await Promise.all([
      this.citas.existeReservadaEnEspecialidadYDia(cmd.pacienteId, cupo.especialidadId, diaEnLima(cupo.fechaHora)),
      this.citas.contarReservadas(cmd.pacienteId),
    ]);
    const cita = Cita.reservar({
      pacienteId: cmd.pacienteId,
      dni,
      cupo,
      ahora,
      yaTieneCitaEseDiaEnLaEspecialidad: duplicada,
      citasReservadasDelPaciente: reservadas,
    });
    await this.citas.guardarReserva(cita); // RN-11: atómico

    // RN-13: si el SMS falla, la cita queda reservada con la notificación PENDIENTE.
    const paciente = await this.pacientes.obtener(cmd.pacienteId);
    const [especialidad, establecimiento] = await Promise.all([
      this.catalogo.especialidad(cupo.especialidadId),
      this.catalogo.establecimiento(cupo.establecimientoId),
    ]);
    const enviado = await this.notificador.citaReservada({
      celular: paciente.celular,
      codigo: cita.codigo,
      especialidad: especialidad?.nombre ?? cupo.especialidadId,
      establecimiento: establecimiento?.nombreCorto ?? cupo.establecimientoId,
      fechaHora: cupo.fechaHora,
      consultorio: cupo.consultorio,
    });
    cita.registrarNotificacion(enviado);
    await this.citas.actualizar(cita);

    return this.ficha.construir(cita, paciente.nombreCompleto);
  }
}
