import { Cache } from '../../../shared/dominio/cache';
import { diaEnLima, inicioDelDiaEnLima, sumarDias } from '../../../shared/dominio/fecha-lima';
import { Cita } from '../dominio/cita';
import { Cupo, DatosCupo } from '../dominio/cupo';
import { RepositorioCitas, RepositorioCupos } from '../dominio/repositorios';

/**
 * ADR-004 · Estrategia de caché para la consulta de disponibilidad (EQ-01).
 *
 * Patrón cache-aside con dos decoradores (patrón Decorator, SOLID-O):
 *  - CuposConCacheRepository guarda en caché los cupos libres de un DÍA completo
 *    (clave cupos:{especialidad}:{establecimiento}:{AAAA-MM-DD}) y filtra en memoria
 *    el rango pedido. Así la clave no depende de la hora exacta de la consulta.
 *  - CitasConInvalidacionRepository borra la clave del día cuando se reserva o cancela
 *    una cita, para que nadie vea un cupo ocupado como libre (RN-01).
 * Si la caché falla, se lee de la base de datos (degradación controlada, EQ-02).
 * La reserva sigue siendo atómica en la base de datos (RN-11): un dato viejo en caché
 * como mucho termina en 409 CUPO_NO_DISPONIBLE, nunca en una doble reserva.
 */
export const TTL_CUPOS_SEGUNDOS = 60;

export const claveCuposDelDia = (especialidadId: string, establecimientoId: string, dia: string) =>
  `cupos:${especialidadId}:${establecimientoId}:${dia}`;

type CupoEnCache = Omit<DatosCupo, 'fechaHora'> & { fechaHora: string };

export class CuposConCacheRepository implements RepositorioCupos {
  constructor(
    private readonly interno: RepositorioCupos,
    private readonly cache: Cache,
    private readonly ttlSegundos = TTL_CUPOS_SEGUNDOS,
  ) {}

  /** Se usa al reservar: siempre va a la base de datos para leer el estado real. */
  buscarPorId(id: string) {
    return this.interno.buscarPorId(id);
  }

  async disponibles(especialidadId: string, establecimientoId: string, desde: Date, hasta: Date): Promise<Cupo[]> {
    const dias: string[] = [];
    for (let d = diaEnLima(desde); inicioDelDiaEnLima(d) < hasta; d = diaEnLima(sumarDias(inicioDelDiaEnLima(d), 1))) dias.push(d);

    const porDia = await Promise.all(dias.map((dia) => this.cuposDelDia(especialidadId, establecimientoId, dia)));
    return porDia.flat()
      .filter((c) => c.fechaHora > desde && c.fechaHora < hasta)
      .map((c) => new Cupo(c));
  }

  private async cuposDelDia(especialidadId: string, establecimientoId: string, dia: string): Promise<DatosCupo[]> {
    const clave = claveCuposDelDia(especialidadId, establecimientoId, dia);
    const enCache = await this.leer(clave);
    if (enCache) return enCache.map((c) => ({ ...c, fechaHora: new Date(c.fechaHora) }));

    const inicio = inicioDelDiaEnLima(dia);
    // (inicio - 1 ms, fin del día): incluye un cupo que empiece justo a las 00:00.
    const cupos = await this.interno.disponibles(especialidadId, establecimientoId, new Date(inicio.getTime() - 1), sumarDias(inicio, 1));
    const datos = cupos.map((c) => c.instantanea());
    await this.escribir(clave, datos.map((c) => ({ ...c, fechaHora: c.fechaHora.toISOString() })));
    return datos;
  }

  private async leer(clave: string) {
    try {
      return await this.cache.obtener<CupoEnCache[]>(clave);
    } catch {
      return null;
    }
  }

  private async escribir(clave: string, valor: CupoEnCache[]) {
    try {
      await this.cache.guardar(clave, valor, this.ttlSegundos);
    } catch {
      // Sin caché la respuesta sigue siendo correcta; solo es más lenta.
    }
  }
}

export class CitasConInvalidacionRepository implements RepositorioCitas {
  constructor(private readonly interno: RepositorioCitas, private readonly cache: Cache) {}

  contarReservadas(pacienteId: string) {
    return this.interno.contarReservadas(pacienteId);
  }
  existeReservadaEnEspecialidadYDia(pacienteId: string, especialidadId: string, dia: string) {
    return this.interno.existeReservadaEnEspecialidadYDia(pacienteId, especialidadId, dia);
  }
  buscarPorId(id: string) {
    return this.interno.buscarPorId(id);
  }
  delPaciente(pacienteId: string) {
    return this.interno.delPaciente(pacienteId);
  }

  async guardarReserva(cita: Cita) {
    try {
      await this.interno.guardarReserva(cita);
    } finally {
      // También si perdió la carrera (409): la caché tenía el cupo como libre y ya no lo está.
      await this.invalidar(cita);
    }
  }

  async actualizar(cita: Cita) {
    await this.interno.actualizar(cita);
    await this.invalidar(cita); // cancelar libera el cupo
  }

  private async invalidar(cita: Cita) {
    const { especialidadId, establecimientoId, fechaHora } = cita.cupo;
    try {
      await this.cache.borrar(claveCuposDelDia(especialidadId, establecimientoId, diaEnLima(fechaHora)));
    } catch {
      // Si Redis está caído, el TTL corto limita el tiempo que un dato puede quedar viejo.
    }
  }
}
