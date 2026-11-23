import { Cita } from '../modules/citas/dominio/cita';
import { Cupo } from '../modules/citas/dominio/cupo';
import { Dni } from '../modules/citas/dominio/dni';
import { EstadoCita } from '../modules/citas/dominio/estado-cita';
import { crearModuloCitas } from '../modules/citas';
import { CuposCacheRepository } from '../modules/citas/infraestructura/cupos-cache.repository';
import { CuposMemoriaRepository } from '../modules/citas/infraestructura/cupos-memoria.repository';

const nuevoCupo = (id = 'C-001') =>
  new Cupo(id, 'Medicina General', 'Hospital Regional de Ayacucho', new Date('2026-11-03T08:00:00-05:00'));

// ---- Dominio: se prueba sin base de datos, sin HTTP y sin PIDE ----
test('Dni rechaza valores que no tienen 8 dígitos', () => {
  expect(() => new Dni('123')).toThrow(/RN-00/);
});

test('RN-01: no se puede reservar un cupo ocupado', () => {
  const cupo = nuevoCupo();
  Cita.reservar(new Dni('45678912'), cupo, false);
  expect(() => Cita.reservar(new Dni('70112233'), cupo, false)).toThrow(/RN-01/);
});

test('RN-02: no se permite una segunda cita en la misma especialidad y día', () => {
  expect(() => Cita.reservar(new Dni('45678912'), nuevoCupo(), true)).toThrow(/RN-02/);
});

test('RN-03: cancelar libera el cupo; una cita atendida no se cancela', () => {
  const cupo = nuevoCupo();
  const cita = Cita.reservar(new Dni('45678912'), cupo, false);
  cita.cancelar();
  expect(cita.obtenerEstado()).toBe(EstadoCita.CANCELADA);
  expect(cupo.estaDisponible()).toBe(true);

  const otra = Cita.reservar(new Dni('45678912'), cupo, false);
  otra.confirmarAsistencia();
  expect(() => otra.cancelar()).toThrow(/RN-03/);
});

// ---- Caso de uso completo con adaptadores intercambiables ----
test('reservar cita responde 201, genera QR y notifica al paciente', async () => {
  const { controller, notificador } = crearModuloCitas([nuevoCupo()], ['45678912']);
  const r = await controller.reservar({ dni: '45678912', cupoId: 'C-001' });
  expect(r.estado).toBe(201);
  expect((r.cuerpo as { codigoQR: string }).codigoQR).toMatch(/^HAMPI-/);
  expect(notificador.enviados.length).toBe(1);
});

test('DNI no validado por RENIEC responde 409', async () => {
  const { controller } = crearModuloCitas([nuevoCupo()], ['45678912']);
  const r = await controller.reservar({ dni: '11111111', cupoId: 'C-001' });
  expect(r.estado).toBe(409);
});

test('el mismo paciente no reserva dos veces el mismo día y especialidad', async () => {
  const { controller } = crearModuloCitas([nuevoCupo('C-001'), nuevoCupo('C-002')], ['45678912']);
  await controller.reservar({ dni: '45678912', cupoId: 'C-001' });
  const r = await controller.reservar({ dni: '45678912', cupoId: 'C-002' });
  expect(r.estado).toBe(409);
});

test('Decorator: la caché evita consultas repetidas y se invalida al guardar', async () => {
  const bd = new CuposMemoriaRepository(new Map([['C-001', nuevoCupo()]]));
  const cache = new CuposCacheRepository(bd);
  await cache.buscarPorId('C-001'); // 1ra vez: va a la base de datos
  await cache.buscarPorId('C-001'); // 2da vez: responde la caché
  expect(bd.consultas).toBe(1);

  const cupo = (await cache.buscarPorId('C-001'))!;
  cupo.ocupar();
  await cache.guardar(cupo);        // invalida la caché
  await cache.buscarPorId('C-001'); // vuelve a la base de datos
  expect(bd.consultas).toBe(2);
});
