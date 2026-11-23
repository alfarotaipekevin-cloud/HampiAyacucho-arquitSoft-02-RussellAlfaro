export type Rol = 'PACIENTE' | 'PERSONAL_SALUD' | 'ESPECIALISTA_GERESA' | 'ADMINISTRADOR';

/** Lo que devuelve POST /identidad/sesion: `expiraEn` son segundos de vigencia del token. */
export interface Sesion {
  token: string;
  expiraEn: number;
  usuario: { id: string; nombre: string; rol: Rol };
}

/** Sesión ya guardada en el navegador, con el vencimiento como fecha absoluta. */
export interface SesionGuardada extends Sesion {
  venceEn: string;
}

export interface Perfil {
  id: string;
  dni: string;
  nombreCompleto: string;
  celular: string;
  correo?: string | null;
  rol: Rol;
}

/** GET /portal/modulos devuelve el usuario y sus tarjetas. */
export interface RespuestaPortal {
  usuario: { nombre: string; rol: Rol };
  modulos: TarjetaModulo[];
}

export interface TarjetaModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  estado: 'ACTIVO' | 'PROXIMAMENTE';
  ruta: string | null;
}

export interface Especialidad {
  id: string;
  nombre: string;
}
export interface Establecimiento {
  id: string;
  nombre: string;
  nivel: string;
  provincia: string;
  direccion: string;
}

export interface Cupo {
  id: string;
  fechaHora: string;
  consultorio: string;
  medico: string;
}

export interface Ficha {
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
  notificacion: 'ENVIADA' | 'PENDIENTE';
}

export interface CitaResumen {
  citaId: string;
  codigo: string;
  especialidad: string;
  establecimiento: string;
  fechaHora: string;
  estado: string;
}

/** Spec 007 · Admisión con QR */
export type EstadoAdmision = 'POR_LLEGAR' | 'EN_ESPERA' | 'ATENDIDA' | 'NO_LLEGO' | 'CANCELADA';

export interface ServiciosAdmision {
  establecimiento: { id: string; nombre: string };
  especialidades: Especialidad[];
}

export interface CitaAgenda {
  citaId: string;
  codigo: string;
  fechaHora: string;
  paciente: string;
  dni: string;
  consultorio: string;
  medico: string;
  estado: string;
  estadoAdmision: EstadoAdmision;
  llegadaEn: string | null;
}

export interface AgendaDia {
  fecha: string;
  resumen: { porLlegar: number; enEspera: number; atendidas: number; noLlegaron: number };
  citas: CitaAgenda[];
}

export interface LecturaQr extends CitaAgenda {
  especialidad: string;
  especialidadId: string;
  establecimiento: string;
  puedeRegistrarLlegada: boolean;
  motivo: string | null;
}
