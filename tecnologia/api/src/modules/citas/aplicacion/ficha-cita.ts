import { formatoLima } from '../../../shared/dominio/fecha-lima';
import { Cita } from '../dominio/cita';
import { GeneradorQR } from '../dominio/servicios-externos';
import { RepositorioCatalogo } from '../dominio/repositorios';

export interface FichaCita {
  citaId: string;
  codigo: string;
  estado: string;
  paciente: string;
  especialidad: string;
  establecimiento: string;
  consultorio: string;
  medico: string;
  fechaHora: string;
  qr: string;
  notificacion: string;
}

/** Puerto para descargar la ficha como documento (RF03). */
export interface ExportadorFicha {
  pdf(ficha: FichaCita): Promise<Buffer>;
}

/** Arma la ficha digital de la cita (RF03) con nombres legibles y el QR. */
export class ConstructorFicha {
  constructor(
    private readonly catalogo: RepositorioCatalogo,
    private readonly qr: GeneradorQR,
  ) {}

  async construir(cita: Cita, paciente: string): Promise<FichaCita> {
    const [especialidad, establecimiento] = await Promise.all([
      this.catalogo.especialidad(cita.cupo.especialidadId),
      this.catalogo.establecimiento(cita.cupo.establecimientoId),
    ]);
    return {
      citaId: cita.id,
      codigo: cita.codigo,
      estado: cita.estado,
      paciente,
      especialidad: especialidad?.nombre ?? cita.cupo.especialidadId,
      establecimiento: establecimiento?.nombre ?? cita.cupo.establecimientoId,
      consultorio: cita.cupo.consultorio,
      medico: cita.cupo.medico,
      fechaHora: formatoLima(cita.cupo.fechaHora),
      qr: await this.qr.generar(cita.codigo), // RN-12: solo el código, sin datos personales
      notificacion: cita.notificacion,
    };
  }
}
