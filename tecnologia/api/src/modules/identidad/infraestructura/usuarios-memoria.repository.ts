import { cuentaExistente } from '../dominio/errores-identidad';
import { RepositorioUsuarios } from '../dominio/repositorio-usuarios';
import { DatosUsuario, Usuario } from '../dominio/usuario';

/** Implementación en memoria para pruebas y para ejecutar la API sin base de datos. */
export class UsuariosMemoriaRepository implements RepositorioUsuarios {
  private readonly filas = new Map<string, DatosUsuario>();

  async buscarPorDni(dni: string) {
    const datos = [...this.filas.values()].find((u) => u.dni === dni);
    return datos ? Usuario.restaurar(datos) : null;
  }

  async buscarPorId(id: string) {
    const datos = this.filas.get(id);
    return datos ? Usuario.restaurar(datos) : null;
  }

  async crear(usuario: Usuario) {
    if (await this.buscarPorDni(usuario.dni)) throw cuentaExistente();
    this.filas.set(usuario.id, usuario.instantanea());
  }

  async actualizar(usuario: Usuario) {
    this.filas.set(usuario.id, usuario.instantanea());
  }
}
