import { RequestHandler } from 'express';
import { Rol } from '../../shared/dominio/usuario-autenticado';
import { Reloj } from '../../shared/dominio/reloj';
import { CancelarCitaUseCase } from './aplicacion/cancelar-cita.use-case';
import { ConsultarDisponibilidadUseCase } from './aplicacion/consultar-disponibilidad.use-case';
import { ConsultarMisCitasUseCase } from './aplicacion/consultar-mis-citas.use-case';
import { ConstructorFicha, ExportadorFicha } from './aplicacion/ficha-cita';
import { ReservarCitaUseCase } from './aplicacion/reservar-cita.use-case';
import { RepositorioCatalogo, RepositorioCitas, RepositorioCupos } from './dominio/repositorios';
import { DirectorioPacientes, GeneradorQR, Notificador, ValidadorIdentidad } from './dominio/servicios-externos';
import { crearRutasCitas } from './presentacion/citas.routes';

export interface DependenciasCitas {
  catalogo: RepositorioCatalogo;
  cupos: RepositorioCupos;
  citas: RepositorioCitas;
  identidad: ValidadorIdentidad;
  notificador: Notificador;
  pacientes: DirectorioPacientes;
  qr: GeneradorQR;
  exportador: ExportadorFicha;
  reloj: Reloj;
  autenticar: RequestHandler;
  autorizarRol: (...roles: Rol[]) => RequestHandler;
}

/** Tarjeta del módulo en el portal (spec 003, RP-04). */
export const TARJETA_CITAS = {
  clave: 'citas',
  nombre: 'Citas',
  descripcion: 'Reserva y consulta tus citas',
  estado: 'ACTIVO' as const,
  ruta: '/citas',
  roles: ['PACIENTE', 'PERSONAL_SALUD'] as Rol[],
};

/** Raíz de composición del módulo Citas: aquí se eligen las implementaciones concretas. */
export function crearModuloCitas(d: DependenciasCitas) {
  const ficha = new ConstructorFicha(d.catalogo, d.qr);
  const rutas = crearRutasCitas(
    {
      disponibilidad: new ConsultarDisponibilidadUseCase(d.catalogo, d.cupos, d.reloj),
      reservarCita: new ReservarCitaUseCase(d.citas, d.cupos, d.catalogo, d.identidad, d.notificador, d.pacientes, ficha, d.reloj),
      misCitas: new ConsultarMisCitasUseCase(d.citas, d.catalogo, d.pacientes, ficha, d.reloj),
      cancelarCita: new CancelarCitaUseCase(d.citas, d.reloj),
      exportador: d.exportador,
    },
    {
      autenticar: d.autenticar,
      soloPacientes: d.autorizarRol('PACIENTE'),
      verCatalogo: d.autorizarRol(...TARJETA_CITAS.roles),
    },
  );
  return { rutas, tarjeta: TARJETA_CITAS };
}
