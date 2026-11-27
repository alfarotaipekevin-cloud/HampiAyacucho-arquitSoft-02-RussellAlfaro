import { DatosInvalidosError, NoEncontradoError } from '../../../shared/dominio/errores';
import { diaEnLima } from '../../../shared/dominio/fecha-lima';
import { Reloj } from '../../../shared/dominio/reloj';
import { RepositorioCatalogo, RepositorioCitas, RepositorioCupos } from '../dominio/repositorios';
import { DirectorioPacientes, Notificador } from '../dominio/servicios-externos';
import { limiteApertura } from './consultar-disponibilidad.use-case';
import { ConstructorFicha, FichaCita } from './ficha-cita';

export interface ReprogramarCitaCommand {
  pacienteId: string;
  citaId: string;
  cupoId: unknown;
}

/** Spec 008 · Reprogramar una cita propia a otro horario del mismo servicio. Conserva el código QR. */
export class ReprogramarCitaUseCase {
  constructor(
    private readonly citas: RepositorioCitas,
    private readonly cupos: RepositorioCupos,
    private readonly catalogo: RepositorioCatalogo,
    private readonly notificador: Notificador,
    private readonly pacientes: DirectorioPacientes,
    private readonly ficha: ConstructorFicha,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(cmd: ReprogramarCitaCommand): Promise<FichaCita> {
    if (typeof cmd.cupoId !== 'string' || cmd.cupoId === '') throw new DatosInvalidosError('cupoId es obligatorio');

    const cita = await this.citas.buscarPorId(cmd.citaId);
    if (!cita || !cita.perteneceA(cmd.pacienteId)) throw new NoEncontradoError('CITA_NO_EXISTE', 'La cita no existe');
    const nuevoCupo = await this.cupos.buscarPorId(cmd.cupoId);
    if (!nuevoCupo) throw new NoEncontradoError('CUPO_NO_EXISTE', 'El cupo solicitado no existe');

    // RN-02: si el nuevo horario es del mismo día, la cita que ya tiene ese día es esta misma.
    const nuevoDia = diaEnLima(nuevoCupo.fechaHora);
    const otraEseDia = nuevoDia !== diaEnLima(cita.cupo.fechaHora)
      && (await this.citas.existeReservadaEnEspecialidadYDia(cmd.pacienteId, nuevoCupo.especialidadId, nuevoDia));

    const ahora = this.reloj.ahora();
    const anterior = cita.reprogramar({ nuevoCupo, ahora, limiteApertura: limiteApertura(ahora), yaTieneOtraCitaEseDia: otraEseDia });
    await this.citas.reprogramar(cita, anterior); // RR-08: atómico

    // RN-13: si el SMS falla, la cita queda reprogramada con la notificación PENDIENTE.
    const paciente = await this.pacientes.obtener(cmd.pacienteId);
    const [especialidad, establecimiento] = await Promise.all([
      this.catalogo.especialidad(nuevoCupo.especialidadId),
      this.catalogo.establecimiento(nuevoCupo.establecimientoId),
    ]);
    const enviado = await this.notificador.citaReservada({
      celular: paciente.celular,
      codigo: cita.codigo,
      especialidad: especialidad?.nombre ?? nuevoCupo.especialidadId,
      establecimiento: establecimiento?.nombreCorto ?? nuevoCupo.establecimientoId,
      fechaHora: nuevoCupo.fechaHora,
      consultorio: nuevoCupo.consultorio,
      reprogramada: true,
    });
    cita.registrarNotificacion(enviado);
    await this.citas.actualizar(cita);

    return this.ficha.construir(cita, paciente.nombreCompleto);
  }
}
