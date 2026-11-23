import { Dni } from '../../../shared/dominio/dni';
import { DatosInvalidosError, ReglaNegocioError } from '../../../shared/dominio/errores';
import { esDiaValido } from '../../../shared/dominio/fecha-lima';
import { PersonaRegistroCivil } from '../../../shared/dominio/registro-civil';
import { RegistroCivil } from '../dominio/registro-civil';

/** Paso 1 de "Crear cuenta": RENIEC confirma el DNI y la fecha de nacimiento (RI-02, RI-03). */
export class VerificarIdentidadUseCase {
  constructor(private readonly registroCivil: RegistroCivil) {}

  async ejecutar(entrada: { dni: unknown; fechaNacimiento: unknown }): Promise<PersonaRegistroCivil> {
    const dni = new Dni(entrada.dni);
    if (!esDiaValido(entrada.fechaNacimiento)) {
      throw new DatosInvalidosError('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
    }

    const resultado = await this.registroCivil.consultar(dni);
    if (resultado.estado === 'NO_EXISTE' || resultado.persona.fechaNacimiento !== entrada.fechaNacimiento) {
      throw new ReglaNegocioError('IDENTIDAD_NO_VALIDA', 'RI-02: los datos no coinciden con RENIEC');
    }
    if (resultado.estado === 'RESTRINGIDO') {
      throw new ReglaNegocioError('DNI_RESTRINGIDO', 'RI-03: el DNI tiene una restricción en RENIEC');
    }
    return resultado.persona;
  }
}
