import { Pool } from 'pg';
import { Rol } from '../../../shared/dominio/usuario-autenticado';
import { cuentaExistente } from '../dominio/errores-identidad';
import { RepositorioUsuarios } from '../dominio/repositorio-usuarios';
import { Usuario } from '../dominio/usuario';

const COLUMNAS = `id, dni, nombres, apellido_paterno, apellido_materno,
  to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, celular, correo,
  hash_contrasena, rol, intentos_fallidos, bloqueado_hasta`;

interface Fila {
  id: string; dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
  fecha_nacimiento: string; celular: string; correo: string | null; hash_contrasena: string;
  rol: Rol; intentos_fallidos: number; bloqueado_hasta: Date | null;
}

const aUsuario = (f: Fila) =>
  Usuario.restaurar({
    id: f.id,
    dni: f.dni,
    nombres: f.nombres,
    apellidoPaterno: f.apellido_paterno,
    apellidoMaterno: f.apellido_materno,
    fechaNacimiento: f.fecha_nacimiento,
    celular: f.celular,
    correo: f.correo,
    hashContrasena: f.hash_contrasena,
    rol: f.rol,
    intentosFallidos: f.intentos_fallidos,
    bloqueadoHasta: f.bloqueado_hasta,
  });

export class UsuariosPostgresRepository implements RepositorioUsuarios {
  constructor(private readonly bd: Pool) {}

  async buscarPorDni(dni: string) {
    const { rows } = await this.bd.query<Fila>(`SELECT ${COLUMNAS} FROM usuarios WHERE dni = $1`, [dni]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async buscarPorId(id: string) {
    const { rows } = await this.bd.query<Fila>(`SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`, [id]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async crear(usuario: Usuario) {
    const u = usuario.instantanea();
    try {
      await this.bd.query(
        `INSERT INTO usuarios (id, dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
           celular, correo, hash_contrasena, rol, intentos_fallidos, bloqueado_hasta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [u.id, u.dni, u.nombres, u.apellidoPaterno, u.apellidoMaterno, u.fechaNacimiento,
          u.celular, u.correo, u.hashContrasena, u.rol, u.intentosFallidos, u.bloqueadoHasta],
      );
    } catch (e: any) {
      if (e?.code === '23505') throw cuentaExistente(); // DNI duplicado (RI-04)
      throw e;
    }
  }

  async actualizar(usuario: Usuario) {
    const u = usuario.instantanea();
    await this.bd.query(
      `UPDATE usuarios SET celular = $2, correo = $3, hash_contrasena = $4, intentos_fallidos = $5, bloqueado_hasta = $6
       WHERE id = $1`,
      [u.id, u.celular, u.correo, u.hashContrasena, u.intentosFallidos, u.bloqueadoHasta],
    );
  }
}
