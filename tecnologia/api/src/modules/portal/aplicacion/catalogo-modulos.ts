import { Rol } from '../../../shared/dominio/usuario-autenticado';
import { TarjetaModulo } from '../dominio/tarjeta-modulo';

/**
 * Módulos previstos en la arquitectura que todavía no se construyen (spec 003, §3).
 * Cuando un módulo se implementa, registra su propia tarjeta ACTIVO y reemplaza a esta.
 */
export const MODULOS_PLANIFICADOS: TarjetaModulo[] = [
  { clave: 'hce', nombre: 'Historia clínica', descripcion: 'Consulta tus atenciones y diagnósticos', estado: 'PROXIMAMENTE', ruta: '/hce', roles: ['PACIENTE', 'PERSONAL_SALUD'] },
  { clave: 'referencias', nombre: 'Referencias', descripcion: 'Deriva pacientes a otros establecimientos', estado: 'PROXIMAMENTE', ruta: '/referencias', roles: ['PERSONAL_SALUD'] },
  { clave: 'indicadores', nombre: 'Indicadores GERESA', descripcion: 'Ocupación, colas y reportes MINSA', estado: 'PROXIMAMENTE', ruta: '/indicadores', roles: ['ESPECIALISTA_GERESA'] },
  { clave: 'auditoria', nombre: 'Auditoría', descripcion: 'Accesos a datos sensibles', estado: 'PROXIMAMENTE', ruta: '/auditoria', roles: ['ADMINISTRADOR'] },
];

/** Catálogo de módulos del portal: cada módulo registra su tarjeta (RP-04). */
export class CatalogoModulos {
  private readonly tarjetas = new Map<string, TarjetaModulo>();
  private readonly orden: string[] = [];

  registrar(tarjeta: TarjetaModulo): void {
    if (!this.tarjetas.has(tarjeta.clave)) this.orden.push(tarjeta.clave);
    this.tarjetas.set(tarjeta.clave, tarjeta);
  }

  /** RP-02: cada rol ve solo sus tarjetas; las activas primero. */
  paraRol(rol: Rol) {
    return this.orden
      .map((clave) => this.tarjetas.get(clave)!)
      .filter((t) => t.roles.includes(rol))
      .sort((a, b) => Number(b.estado === 'ACTIVO') - Number(a.estado === 'ACTIVO'))
      .map(({ roles: _roles, ...visible }) => visible);
  }
}
