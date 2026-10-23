import { Cupo } from './dominio/cupo';
import { ReservarCitaUseCase } from './aplicacion/reservar-cita.use-case';
import { CitasMemoriaRepository } from './infraestructura/citas-memoria.repository';
import { CuposCacheRepository } from './infraestructura/cupos-cache.repository';
import { CuposMemoriaRepository } from './infraestructura/cupos-memoria.repository';
import { NotificadorConsolaAdapter } from './infraestructura/notificador-consola.adapter';
import { PideSimuladoAdapter } from './infraestructura/pide-simulado.adapter';
import { CitasController } from './presentacion/citas.controller';

/**
 * Raíz de composición: el ÚNICO lugar que conoce las implementaciones concretas.
 * Pasar a producción = cambiar estas líneas por PostgreSQL, Redis, PIDE y SMS.
 */
export function crearModuloCitas(cuposIniciales: Cupo[], dnisRenieC: string[]) {
  const cuposBd = new CuposMemoriaRepository(new Map(cuposIniciales.map((c) => [c.id, c])));
  const cupos = new CuposCacheRepository(cuposBd);
  const citas = new CitasMemoriaRepository();
  const identidad = new PideSimuladoAdapter(dnisRenieC);
  const notificador = new NotificadorConsolaAdapter();

  const reservarCita = new ReservarCitaUseCase(citas, cupos, identidad, notificador);
  return { controller: new CitasController(reservarCita), notificador, cuposBd };
}
