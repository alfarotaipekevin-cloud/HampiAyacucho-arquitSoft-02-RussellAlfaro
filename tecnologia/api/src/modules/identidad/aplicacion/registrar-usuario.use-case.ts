import { Dni } from '../../../shared/dominio/dni';
import { DatosInvalidosError } from '../../../shared/dominio/errores';
import { validarCelular, validarContrasenaNueva, validarCorreo } from '../dominio/credenciales';
import { cuentaExistente } from '../dominio/errores-identidad';
import { Hasheador } from '../dominio/hasheador';
import { RepositorioUsuarios } from '../dominio/repositorio-usuarios';
import { Usuario } from '../dominio/usuario';
import { VerificarIdentidadUseCase } from './verificar-identidad.use-case';

export interface RegistrarUsuarioCommand {
  dni: unknown;
  fechaNacimiento: unknown;
  celular: unknown;
  correo?: unknown;
  contrasena: unknown;
  aceptaTratamientoDatos: unknown;
}

/** HU09 · Crear cuenta de paciente (spec 002, §5.1). */
export class RegistrarUsuarioUseCase {
  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly verificarIdentidad: VerificarIdentidadUseCase,
    private readonly hasheador: Hasheador,
  ) {}

  async ejecutar(cmd: RegistrarUsuarioCommand) {
    const dni = new Dni(cmd.dni);
    const celular = validarCelular(cmd.celular);
    const correo = validarCorreo(cmd.correo);
    const contrasena = validarContrasenaNueva(cmd.contrasena);
    if (cmd.aceptaTratamientoDatos !== true) {
      throw new DatosInvalidosError('Debes aceptar el tratamiento de tus datos personales (Ley 29733)', 'CONSENTIMIENTO_REQUERIDO');
    }
    if (await this.usuarios.buscarPorDni(dni.valor)) throw cuentaExistente(); // RI-04

    const persona = await this.verificarIdentidad.ejecutar({ dni: dni.valor, fechaNacimiento: cmd.fechaNacimiento });
    const usuario = Usuario.registrar(persona, celular, correo, await this.hasheador.hashear(contrasena));
    await this.usuarios.crear(usuario);

    return { usuarioId: usuario.id, nombreCompleto: usuario.nombreCompleto, rol: usuario.rol };
  }
}
