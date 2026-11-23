import { DatosInvalidosError, NoEncontradoError } from '../../../shared/dominio/errores';
import { diaEnLima, esDiaValido, formatoLima, inicioDelDiaEnLima, sumarDias } from '../../../shared/dominio/fecha-lima';
import { Reloj } from '../../../shared/dominio/reloj';
import { RepositorioCatalogo, RepositorioCupos } from '../dominio/repositorios';

/** RN-06: se muestran cupos desde ahora hasta 30 días después. */
export const DIAS_DE_APERTURA = 30;

const textoObligatorio = (valor: unknown, nombre: string): string => {
  if (typeof valor !== 'string' || valor.trim() === '') throw new DatosInvalidosError(`El parámetro ${nombre} es obligatorio`);
  return valor;
};

/** HU01 · RF01 · spec 004. */
export class ConsultarDisponibilidadUseCase {
  constructor(
    private readonly catalogo: RepositorioCatalogo,
    private readonly repoCupos: RepositorioCupos,
    private readonly reloj: Reloj,
  ) {}

  especialidades() {
    return this.catalogo.especialidades();
  }

  async establecimientos(especialidadId: unknown) {
    const especialidad = await this.especialidadExistente(textoObligatorio(especialidadId, 'especialidadId'));
    const lista = await this.catalogo.establecimientosConEspecialidad(especialidad.id);
    return lista.map(({ id, nombre, nivel, provincia, direccion }) => ({ id, nombre, nivel, provincia, direccion }));
  }

  /** Cupos libres de un día (RN-05, RN-06, RN-07). */
  async cuposDelDia(filtro: { especialidadId: unknown; establecimientoId: unknown; fecha: unknown }) {
    const { especialidadId, establecimientoId } = await this.validarFiltro(filtro);
    if (!esDiaValido(filtro.fecha)) throw new DatosInvalidosError('La fecha debe tener el formato AAAA-MM-DD');

    const ahora = this.reloj.ahora();
    const inicio = inicioDelDiaEnLima(filtro.fecha);
    const desde = inicio > ahora ? inicio : ahora;
    const hasta = this.minimo(sumarDias(inicio, 1), this.limiteApertura(ahora));
    if (desde >= hasta) return [];

    const cupos = await this.repoCupos.disponibles(especialidadId, establecimientoId, desde, hasta);
    return cupos.map((c) => ({ id: c.id, fechaHora: formatoLima(c.fechaHora), consultorio: c.consultorio, medico: c.medico }));
  }

  /** Días con al menos un cupo libre, para marcar el calendario. */
  async fechas(filtro: { especialidadId: unknown; establecimientoId: unknown }) {
    const { especialidadId, establecimientoId } = await this.validarFiltro(filtro);
    const ahora = this.reloj.ahora();
    const cupos = await this.repoCupos.disponibles(especialidadId, establecimientoId, ahora, this.limiteApertura(ahora));
    return [...new Set(cupos.map((c) => diaEnLima(c.fechaHora)))];
  }

  private async validarFiltro(filtro: { especialidadId: unknown; establecimientoId: unknown }) {
    const especialidadId = textoObligatorio(filtro.especialidadId, 'especialidadId');
    const establecimientoId = textoObligatorio(filtro.establecimientoId, 'establecimientoId');
    await this.especialidadExistente(especialidadId);
    if (!(await this.catalogo.establecimiento(establecimientoId))) {
      throw new NoEncontradoError('ESTABLECIMIENTO_NO_EXISTE', 'El establecimiento no existe');
    }
    return { especialidadId, establecimientoId };
  }

  private async especialidadExistente(id: string) {
    const especialidad = await this.catalogo.especialidad(id);
    if (!especialidad) throw new NoEncontradoError('ESPECIALIDAD_NO_EXISTE', 'La especialidad no existe');
    return especialidad;
  }

  /** Fin del último día abierto: hoy + 30 días, hasta la medianoche en Lima. */
  private limiteApertura(ahora: Date) {
    return inicioDelDiaEnLima(diaEnLima(sumarDias(ahora, DIAS_DE_APERTURA + 1)));
  }

  private minimo(a: Date, b: Date) {
    return a < b ? a : b;
  }
}
