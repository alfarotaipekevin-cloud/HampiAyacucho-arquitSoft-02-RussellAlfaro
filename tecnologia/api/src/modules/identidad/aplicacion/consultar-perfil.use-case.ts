import { NoEncontradoError } from '../../../shared/dominio/errores';
import { RepositorioUsuarios } from '../dominio/repositorio-usuarios';

export interface PerfilUsuario {
  id: string;
  dni: string;
  nombreCompleto: string;
  celular: string;
  rol: string;
}

/** GET /yo y datos de contacto que otros módulos piden a Identidad (p. ej. Citas para el SMS). */
export class ConsultarPerfilUseCase {
  constructor(private readonly usuarios: RepositorioUsuarios) {}

  async ejecutar(usuarioId: string): Promise<PerfilUsuario> {
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new NoEncontradoError('USUARIO_NO_EXISTE', 'La cuenta no existe');
    return {
      id: usuario.id,
      dni: usuario.dni,
      nombreCompleto: usuario.nombreCompleto,
      celular: usuario.celular,
      rol: usuario.rol,
    };
  }
}
