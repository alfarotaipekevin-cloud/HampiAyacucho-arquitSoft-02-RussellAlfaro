import { Reloj } from '../../../shared/dominio/reloj';
import { credencialesInvalidas, cuentaBloqueada } from '../dominio/errores-identidad';
import { EmisorTokens } from '../dominio/emisor-tokens';
import { Hasheador } from '../dominio/hasheador';
import { RepositorioUsuarios } from '../dominio/repositorio-usuarios';

/** HU10 · Iniciar sesión con número de documento y contraseña (spec 002, §5.2). */
export class IniciarSesionUseCase {
  // Hash de una contraseña cualquiera: se compara aunque el DNI no exista, para no revelar
  // por el tiempo de respuesta qué documentos tienen cuenta (RI-07).
  private hashSenuelo?: Promise<string>;

  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly hasheador: Hasheador,
    private readonly emisor: EmisorTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(entrada: { numeroDocumento: unknown; contrasena: unknown }) {
    const { numeroDocumento, contrasena } = entrada;
    if (typeof numeroDocumento !== 'string' || typeof contrasena !== 'string') throw credencialesInvalidas();

    const usuario = await this.usuarios.buscarPorDni(numeroDocumento);
    if (!usuario) {
      this.hashSenuelo ??= this.hasheador.hashear('contrasena-senuelo-1');
      await this.hasheador.comparar(contrasena, await this.hashSenuelo);
      throw credencialesInvalidas();
    }

    const ahora = this.reloj.ahora();
    if (usuario.estaBloqueado(ahora)) throw cuentaBloqueada(usuario.bloqueadoHasta!);

    if (!(await this.hasheador.comparar(contrasena, usuario.hashContrasena))) {
      usuario.registrarIntentoFallido(ahora);
      await this.usuarios.actualizar(usuario);
      if (usuario.estaBloqueado(ahora)) throw cuentaBloqueada(usuario.bloqueadoHasta!);
      throw credencialesInvalidas();
    }

    usuario.registrarIngresoExitoso();
    await this.usuarios.actualizar(usuario);
    const sesion = usuario.comoAutenticado();
    const { token, expiraEn } = this.emisor.emitir(sesion);
    return { token, expiraEn, usuario: { id: sesion.id, nombre: sesion.nombre, rol: sesion.rol } };
  }
}
