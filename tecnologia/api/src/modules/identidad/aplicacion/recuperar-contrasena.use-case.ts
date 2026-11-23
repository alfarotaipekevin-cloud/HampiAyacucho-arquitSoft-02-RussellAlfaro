import { DatosInvalidosError, ErrorAplicacion } from '../../../shared/dominio/errores';
import { Reloj } from '../../../shared/dominio/reloj';
import {
  MAX_INTENTOS_CODIGO, MINUTOS_VIGENCIA_CODIGO, MensajeroIdentidad, RepositorioCodigos, generarCodigo,
} from '../dominio/codigo-recuperacion';
import { validarContrasenaNueva } from '../dominio/credenciales';
import { Hasheador } from '../dominio/hasheador';
import { RepositorioUsuarios } from '../dominio/repositorio-usuarios';

const MENSAJE_SOLICITUD = 'Si el documento tiene una cuenta, enviaremos un código al celular registrado';
const codigoInvalido = () => new DatosInvalidosError('El código no es correcto', 'CODIGO_INVALIDO');

/** HU11 · Recuperar la contraseña con un código por SMS (spec 002, §5.4). */
export class RecuperarContrasenaUseCase {
  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly codigos: RepositorioCodigos,
    private readonly mensajero: MensajeroIdentidad,
    private readonly hasheador: Hasheador,
    private readonly reloj: Reloj,
  ) {}

  /** RI-12: la respuesta no dice si el documento tiene cuenta; solo muestra el celular enmascarado si lo hay. */
  async solicitar(entrada: { numeroDocumento: unknown }) {
    const usuario = typeof entrada.numeroDocumento === 'string' ? await this.usuarios.buscarPorDni(entrada.numeroDocumento) : null;
    if (!usuario) return { mensaje: MENSAJE_SOLICITUD };

    const codigo = generarCodigo();
    await this.codigos.guardar({
      usuarioId: usuario.id,
      hashCodigo: await this.hasheador.hashear(codigo),
      expiraEn: new Date(this.reloj.ahora().getTime() + MINUTOS_VIGENCIA_CODIGO * 60_000),
      intentos: 0,
    });
    await this.mensajero.enviarCodigo(usuario.celular, codigo);
    return { mensaje: MENSAJE_SOLICITUD, celular: `*****${usuario.celular.slice(-4)}` };
  }

  async confirmar(entrada: { numeroDocumento: unknown; codigo: unknown; nuevaContrasena: unknown }) {
    const nueva = validarContrasenaNueva(entrada.nuevaContrasena);
    if (typeof entrada.codigo !== 'string' || !/^\d{6}$/.test(entrada.codigo)) throw codigoInvalido();

    const usuario = typeof entrada.numeroDocumento === 'string' ? await this.usuarios.buscarPorDni(entrada.numeroDocumento) : null;
    const registro = usuario ? await this.codigos.buscar(usuario.id) : null;
    if (!usuario || !registro) throw codigoInvalido();

    if (registro.expiraEn <= this.reloj.ahora()) {
      await this.codigos.eliminar(usuario.id);
      throw new ErrorAplicacion('VENCIDO', 'CODIGO_VENCIDO', 'RI-11: el código venció. Solicita uno nuevo.');
    }
    if (!(await this.hasheador.comparar(entrada.codigo, registro.hashCodigo))) {
      registro.intentos += 1;
      if (registro.intentos >= MAX_INTENTOS_CODIGO) {
        await this.codigos.eliminar(usuario.id);
        throw new ErrorAplicacion('DEMASIADOS_INTENTOS', 'INTENTOS_AGOTADOS', 'RI-11: agotaste los 3 intentos. Solicita un código nuevo.');
      }
      await this.codigos.guardar(registro);
      throw codigoInvalido();
    }

    usuario.cambiarContrasena(await this.hasheador.hashear(nueva));
    await this.usuarios.actualizar(usuario);
    await this.codigos.eliminar(usuario.id);
  }
}
