import { randomUUID } from 'node:crypto';
import { Rol, UsuarioAutenticado } from '../../../shared/dominio/usuario-autenticado';
import { PersonaRegistroCivil } from '../../../shared/dominio/registro-civil';

export interface DatosUsuario {
  id: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  celular: string;
  correo: string | null;
  hashContrasena: string;
  rol: Rol;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

/** Entidad: cuenta de una persona en Hampi. Aplica RI-08 (bloqueo por intentos fallidos). */
export class Usuario {
  static readonly MAX_INTENTOS = 5;
  static readonly MINUTOS_BLOQUEO = 15;

  private constructor(private datos: DatosUsuario) {}

  static registrar(persona: PersonaRegistroCivil, celular: string, correo: string | null, hashContrasena: string): Usuario {
    return new Usuario({
      id: randomUUID(),
      dni: persona.dni,
      nombres: persona.nombres,
      apellidoPaterno: persona.apellidoPaterno,
      apellidoMaterno: persona.apellidoMaterno,
      fechaNacimiento: persona.fechaNacimiento,
      celular,
      correo,
      hashContrasena,
      rol: 'PACIENTE', // RI-13
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });
  }

  static restaurar(datos: DatosUsuario): Usuario {
    return new Usuario({ ...datos });
  }

  get id() { return this.datos.id; }
  get dni() { return this.datos.dni; }
  get rol() { return this.datos.rol; }
  get celular() { return this.datos.celular; }
  get hashContrasena() { return this.datos.hashContrasena; }
  get bloqueadoHasta() { return this.datos.bloqueadoHasta; }

  get nombreCompleto(): string {
    return `${this.datos.nombres} ${this.datos.apellidoPaterno} ${this.datos.apellidoMaterno}`;
  }

  estaBloqueado(ahora: Date): boolean {
    return this.datos.bloqueadoHasta !== null && this.datos.bloqueadoHasta > ahora;
  }

  /** RI-08: al quinto intento fallido seguido la cuenta se bloquea 15 minutos. */
  registrarIntentoFallido(ahora: Date): void {
    this.datos.intentosFallidos += 1;
    if (this.datos.intentosFallidos >= Usuario.MAX_INTENTOS) {
      this.datos.bloqueadoHasta = new Date(ahora.getTime() + Usuario.MINUTOS_BLOQUEO * 60_000);
      this.datos.intentosFallidos = 0;
    }
  }

  /** HU11: la nueva contraseña también desbloquea la cuenta. */
  cambiarContrasena(nuevoHash: string): void {
    this.datos.hashContrasena = nuevoHash;
    this.registrarIngresoExitoso();
  }

  registrarIngresoExitoso(): void {
    this.datos.intentosFallidos = 0;
    this.datos.bloqueadoHasta = null;
  }

  comoAutenticado(): UsuarioAutenticado {
    return { id: this.datos.id, dni: this.datos.dni, nombre: this.datos.nombres, rol: this.datos.rol };
  }

  instantanea(): DatosUsuario {
    return { ...this.datos };
  }
}
