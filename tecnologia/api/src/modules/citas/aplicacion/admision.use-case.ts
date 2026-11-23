import { DatosInvalidosError, ErrorAplicacion, NoEncontradoError } from '../../../shared/dominio/errores';
import { diaEnLima, formatoLima } from '../../../shared/dominio/fecha-lima';
import { Reloj } from '../../../shared/dominio/reloj';
import { Cita } from '../dominio/cita';
import { EstadoCita } from '../dominio/estado-cita';
import { RepositorioCatalogo, RepositorioCitas, RepositorioPersonal } from '../dominio/repositorios';
import { DirectorioPacientes } from '../dominio/servicios-externos';

/** Cómo ve la recepción cada cita del día. */
export type EstadoAdmision = 'POR_LLEGAR' | 'EN_ESPERA' | 'ATENDIDA' | 'NO_LLEGO' | 'CANCELADA';

export interface CitaDeAgenda {
  citaId: string;
  codigo: string;
  fechaHora: string;
  paciente: string;
  dni: string;
  consultorio: string;
  medico: string;
  estado: string;
  estadoAdmision: EstadoAdmision;
  llegadaEn: string | null;
}

const CODIGO = /^HAMPI-[0-9A-F]{8}$/;

/**
 * Spec 007 · Admisión con QR: el personal de salud elige el servicio de su piso, ve las citas de hoy,
 * lee el QR (o escribe el código), registra la llegada y luego marca la cita como atendida.
 */
export class AdmisionUseCase {
  constructor(
    private readonly citas: RepositorioCitas,
    private readonly catalogo: RepositorioCatalogo,
    private readonly personal: RepositorioPersonal,
    private readonly pacientes: DirectorioPacientes,
    private readonly reloj: Reloj,
  ) {}

  /** RA-01: el establecimiento sale de la cuenta del personal, nunca de la petición. */
  private async establecimientoDe(dniPersonal: string): Promise<string> {
    const establecimientoId = await this.personal.establecimientoDe(dniPersonal);
    if (!establecimientoId) {
      throw new ErrorAplicacion('PROHIBIDO', 'SIN_ESTABLECIMIENTO', 'Tu cuenta no está asignada a un establecimiento');
    }
    return establecimientoId;
  }

  /** Establecimiento del personal y los servicios que atiende, para elegir el de su piso. */
  async servicios(dniPersonal: string) {
    const establecimientoId = await this.establecimientoDe(dniPersonal);
    const [establecimiento, especialidades] = await Promise.all([
      this.catalogo.establecimiento(establecimientoId),
      this.catalogo.especialidadesDelEstablecimiento(establecimientoId),
    ]);
    return { establecimiento: { id: establecimientoId, nombre: establecimiento?.nombre ?? establecimientoId }, especialidades };
  }

  /** RA-02: agenda de hoy del servicio elegido, por hora, con un resumen para la recepción. */
  async agenda(dniPersonal: string, especialidadId: unknown) {
    if (typeof especialidadId !== 'string' || !especialidadId) throw new DatosInvalidosError('Elige un servicio', 'ESPECIALIDAD_REQUERIDA');
    const establecimientoId = await this.establecimientoDe(dniPersonal);
    const atiende = (await this.catalogo.especialidadesDelEstablecimiento(establecimientoId)).some((e) => e.id === especialidadId);
    if (!atiende) throw new NoEncontradoError('SERVICIO_NO_EXISTE', 'Tu establecimiento no atiende ese servicio');

    const ahora = this.reloj.ahora();
    const citas = await this.citas.delDia(establecimientoId, especialidadId, diaEnLima(ahora));
    const lista = await Promise.all(citas.map((c) => this.aAgenda(c, ahora)));
    const contar = (estado: EstadoAdmision) => lista.filter((c) => c.estadoAdmision === estado).length;
    return {
      fecha: diaEnLima(ahora),
      resumen: { porLlegar: contar('POR_LLEGAR'), enEspera: contar('EN_ESPERA'), atendidas: contar('ATENDIDA'), noLlegaron: contar('NO_LLEGO') },
      citas: lista,
    };
  }

  /** Lo que muestra la pantalla al leer el QR: datos para comparar con el DNI físico y si se puede registrar la llegada. */
  async buscarPorCodigo(dniPersonal: string, codigo: string) {
    const normalizado = codigo.trim().toUpperCase();
    if (!CODIGO.test(normalizado)) throw new DatosInvalidosError('El código no tiene el formato HAMPI-XXXXXXXX', 'CODIGO_INVALIDO');
    const establecimientoId = await this.establecimientoDe(dniPersonal);
    const cita = await this.citas.buscarPorCodigo(normalizado);
    if (!cita) throw new NoEncontradoError('CITA_NO_EXISTE', 'No hay ninguna cita con ese código');

    const ahora = this.reloj.ahora();
    const [especialidad, establecimiento] = await Promise.all([
      this.catalogo.especialidad(cita.cupo.especialidadId),
      this.catalogo.establecimiento(cita.cupo.establecimientoId),
    ]);
    // Se intenta la regla sobre una copia para decir de antemano si se puede registrar y por qué no.
    let puedeRegistrarLlegada = true;
    let motivo: string | null = null;
    try {
      Cita.restaurar({ ...this.datosDe(cita) }).registrarLlegada(ahora, establecimientoId);
    } catch (e) {
      puedeRegistrarLlegada = false;
      motivo = e instanceof Error ? e.message : String(e);
    }
    const esDeOtroEstablecimiento = !cita.esDelEstablecimiento(establecimientoId);
    return {
      ...(await this.aAgenda(cita, ahora, esDeOtroEstablecimiento)),
      especialidad: especialidad?.nombre ?? cita.cupo.especialidadId,
      especialidadId: cita.cupo.especialidadId,
      establecimiento: establecimiento?.nombre ?? cita.cupo.establecimientoId,
      puedeRegistrarLlegada,
      motivo,
    };
  }

  async registrarLlegada(dniPersonal: string, citaId: string) {
    const establecimientoId = await this.establecimientoDe(dniPersonal);
    const cita = await this.citaVisible(citaId, establecimientoId);
    const ahora = this.reloj.ahora();
    cita.registrarLlegada(ahora, establecimientoId);
    await this.citas.actualizar(cita);
    return this.aAgenda(cita, ahora);
  }

  async atender(dniPersonal: string, citaId: string) {
    const establecimientoId = await this.establecimientoDe(dniPersonal);
    const cita = await this.citaVisible(citaId, establecimientoId);
    cita.atender(establecimientoId);
    await this.citas.actualizar(cita);
    return this.aAgenda(cita, this.reloj.ahora());
  }

  /** Una cita de otro establecimiento responde 404, como si no existiera (igual que CA-005-10). */
  private async citaVisible(citaId: string, establecimientoId: string) {
    const cita = await this.citas.buscarPorId(citaId);
    if (!cita || !cita.esDelEstablecimiento(establecimientoId)) throw new NoEncontradoError('CITA_NO_EXISTE', 'La cita no existe');
    return cita;
  }

  private datosDe(c: Cita) {
    return {
      id: c.id, codigo: c.codigo, pacienteId: c.pacienteId, dniPaciente: c.dniPaciente, cupo: c.cupo,
      estado: c.estado, notificacion: c.notificacion, creadaEn: c.creadaEn, llegadaEn: c.llegadaEn,
    };
  }

  private estadoAdmision(c: Cita, ahora: Date): EstadoAdmision {
    if (c.estado === EstadoCita.ATENDIDA) return 'ATENDIDA';
    if (c.estado === EstadoCita.CANCELADA) return 'CANCELADA';
    if (c.estado === EstadoCita.NO_ASISTIO) return 'NO_LLEGO';
    if (c.llegadaEn) return 'EN_ESPERA';
    return c.vencioLaTolerancia(ahora) ? 'NO_LLEGO' : 'POR_LLEGAR';
  }

  /** De otro establecimiento: no se muestran el nombre ni el DNI del paciente (mínimo privilegio). */
  private async aAgenda(c: Cita, ahora: Date, ocultarPaciente = false): Promise<CitaDeAgenda> {
    const paciente = ocultarPaciente ? null : await this.pacientes.obtener(c.pacienteId).catch(() => null);
    return {
      citaId: c.id,
      codigo: c.codigo,
      fechaHora: formatoLima(c.cupo.fechaHora),
      paciente: paciente?.nombreCompleto ?? '—',
      dni: ocultarPaciente ? '********' : c.dniPaciente,
      consultorio: c.cupo.consultorio,
      medico: c.cupo.medico,
      estado: c.estado,
      estadoAdmision: this.estadoAdmision(c, ahora),
      llegadaEn: c.llegadaEn ? formatoLima(c.llegadaEn) : null,
    };
  }
}
