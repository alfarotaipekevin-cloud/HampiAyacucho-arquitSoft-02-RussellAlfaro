import { ReglaNegocioError } from '../../../shared/dominio/errores';
import { diaEnLima } from '../../../shared/dominio/fecha-lima';
import { Especialidad, Establecimiento } from '../dominio/catalogo';
import { Cita, DatosCita } from '../dominio/cita';
import { Cupo, DatosCupo } from '../dominio/cupo';
import { EstadoCita } from '../dominio/estado-cita';
import { RepositorioCatalogo, RepositorioCitas, RepositorioCupos } from '../dominio/repositorios';

// Implementaciones en memoria: pruebas rápidas y API sin base de datos (MODO_BD=memoria).
// Guardan copias para que nadie modifique el estado "persistido" sin pasar por el repositorio.

export class CatalogoMemoriaRepository implements RepositorioCatalogo {
  constructor(
    private readonly especialidadesBase: Especialidad[],
    private readonly establecimientosBase: Establecimiento[],
    /** Pares establecimiento-especialidad que se atienden (RN-08). */
    private readonly ofertas: { establecimientoId: string; especialidadId: string }[],
  ) {}

  async especialidades() {
    return [...this.especialidadesBase].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async especialidad(id: string) {
    return this.especialidadesBase.find((e) => e.id === id) ?? null;
  }

  async establecimiento(id: string) {
    return this.establecimientosBase.find((e) => e.id === id) ?? null;
  }

  async establecimientosConEspecialidad(especialidadId: string) {
    const ids = new Set(this.ofertas.filter((o) => o.especialidadId === especialidadId).map((o) => o.establecimientoId));
    return this.establecimientosBase.filter((e) => ids.has(e.id));
  }
}

export class CuposMemoriaRepository implements RepositorioCupos {
  readonly filas = new Map<string, DatosCupo>();

  constructor(cupos: DatosCupo[] = []) {
    cupos.forEach((c) => this.filas.set(c.id, { ...c }));
  }

  async buscarPorId(id: string) {
    const fila = this.filas.get(id);
    return fila ? new Cupo({ ...fila }) : null;
  }

  async disponibles(especialidadId: string, establecimientoId: string, desde: Date, hasta: Date) {
    return [...this.filas.values()]
      .filter((c) => c.especialidadId === especialidadId && c.establecimientoId === establecimientoId
        && c.estado === 'DISPONIBLE' && c.fechaHora > desde && c.fechaHora < hasta)
      .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
      .map((c) => new Cupo({ ...c }));
  }
}

type FilaCita = Omit<DatosCita, 'cupo'> & { cupoId: string };

export class CitasMemoriaRepository implements RepositorioCitas {
  private readonly filas = new Map<string, FilaCita>();

  constructor(private readonly cupos: CuposMemoriaRepository) {}

  async contarReservadas(pacienteId: string) {
    return [...this.filas.values()].filter((c) => c.pacienteId === pacienteId && c.estado === EstadoCita.RESERVADA).length;
  }

  async existeReservadaEnEspecialidadYDia(pacienteId: string, especialidadId: string, dia: string) {
    return [...this.filas.values()].some((c) => {
      const cupo = this.cupos.filas.get(c.cupoId)!;
      return c.pacienteId === pacienteId && c.estado === EstadoCita.RESERVADA
        && cupo.especialidadId === especialidadId && diaEnLima(cupo.fechaHora) === dia;
    });
  }

  /** Sin "await" entre la verificación y la escritura: en Node es atómico (RN-11). */
  async guardarReserva(cita: Cita) {
    const cupo = this.cupos.filas.get(cita.cupo.id);
    if (!cupo || cupo.estado !== 'DISPONIBLE') {
      throw new ReglaNegocioError('CUPO_NO_DISPONIBLE', 'RN-01: el cupo ya no está disponible');
    }
    cupo.estado = 'OCUPADO';
    this.filas.set(cita.id, this.aFila(cita));
  }

  async actualizar(cita: Cita) {
    this.filas.set(cita.id, this.aFila(cita));
    this.cupos.filas.set(cita.cupo.id, cita.cupo.instantanea());
  }

  async buscarPorId(id: string) {
    const fila = this.filas.get(id);
    return fila ? this.aCita(fila) : null;
  }

  async delPaciente(pacienteId: string) {
    return [...this.filas.values()].filter((c) => c.pacienteId === pacienteId).map((f) => this.aCita(f));
  }

  private aFila(cita: Cita): FilaCita {
    return {
      id: cita.id, codigo: cita.codigo, pacienteId: cita.pacienteId, dniPaciente: cita.dniPaciente,
      cupoId: cita.cupo.id, estado: cita.estado, notificacion: cita.notificacion, creadaEn: cita.creadaEn,
    };
  }

  private aCita({ cupoId, ...fila }: FilaCita) {
    return Cita.restaurar({ ...fila, cupo: new Cupo({ ...this.cupos.filas.get(cupoId)! }) });
  }
}
