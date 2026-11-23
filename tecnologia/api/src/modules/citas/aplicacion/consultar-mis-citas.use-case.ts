import { NoEncontradoError } from '../../../shared/dominio/errores';
import { formatoLima } from '../../../shared/dominio/fecha-lima';
import { Reloj } from '../../../shared/dominio/reloj';
import { EstadoCita } from '../dominio/estado-cita';
import { RepositorioCatalogo, RepositorioCitas } from '../dominio/repositorios';
import { DirectorioPacientes } from '../dominio/servicios-externos';
import { ConstructorFicha } from './ficha-cita';

/** HU13 · Mis citas y ficha (spec 005, §4.2). Un paciente solo ve sus propias citas. */
export class ConsultarMisCitasUseCase {
  constructor(
    private readonly citas: RepositorioCitas,
    private readonly catalogo: RepositorioCatalogo,
    private readonly pacientes: DirectorioPacientes,
    private readonly ficha: ConstructorFicha,
    private readonly reloj: Reloj,
  ) {}

  /** Próximas primero (de la más cercana a la más lejana) y luego las pasadas (la más reciente primero). */
  async listar(pacienteId: string, estado?: unknown) {
    const ahora = this.reloj.ahora().getTime();
    const filtro = typeof estado === 'string' && estado in EstadoCita ? estado : undefined;
    const citas = (await this.citas.delPaciente(pacienteId)).filter((c) => !filtro || c.estado === filtro);

    const momento = (t: number) => (t >= ahora ? t - ahora : Number.MAX_SAFE_INTEGER / 2 + (ahora - t));
    citas.sort((a, b) => momento(a.cupo.fechaHora.getTime()) - momento(b.cupo.fechaHora.getTime()));

    const especialidades = new Map((await this.catalogo.especialidades()).map((e) => [e.id, e.nombre]));
    return Promise.all(
      citas.map(async (c) => ({
        citaId: c.id,
        codigo: c.codigo,
        especialidad: especialidades.get(c.cupo.especialidadId) ?? c.cupo.especialidadId,
        establecimiento: (await this.catalogo.establecimiento(c.cupo.establecimientoId))?.nombre ?? c.cupo.establecimientoId,
        fechaHora: formatoLima(c.cupo.fechaHora),
        estado: c.estado,
      })),
    );
  }

  /** CA-005-10: la cita de otro paciente responde 404, como si no existiera. */
  async obtener(pacienteId: string, citaId: string) {
    const cita = await this.citas.buscarPorId(citaId);
    if (!cita || !cita.perteneceA(pacienteId)) throw new NoEncontradoError('CITA_NO_EXISTE', 'La cita no existe');
    const paciente = await this.pacientes.obtener(pacienteId);
    return this.ficha.construir(cita, paciente.nombreCompleto);
  }
}
