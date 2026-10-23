import { ReglaNegocioError } from '../../../shared/errores';
import { ReservarCitaUseCase } from '../aplicacion/reservar-cita.use-case';

export interface RespuestaHttp {
  estado: number;
  cuerpo: unknown;
}

/** Traduce HTTP ⇄ caso de uso. No contiene reglas de negocio. */
export class CitasController {
  constructor(private readonly reservarCita: ReservarCitaUseCase) {}

  async reservar(cuerpo: { dni?: string; cupoId?: string }): Promise<RespuestaHttp> {
    if (!cuerpo.dni || !cuerpo.cupoId) {
      return { estado: 400, cuerpo: { error: 'dni y cupoId son obligatorios' } };
    }
    try {
      const resultado = await this.reservarCita.ejecutar({ dni: cuerpo.dni, cupoId: cuerpo.cupoId });
      return { estado: 201, cuerpo: resultado };
    } catch (e) {
      if (e instanceof ReglaNegocioError) return { estado: 409, cuerpo: { error: e.message } };
      throw e;
    }
  }
}
