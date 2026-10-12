import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.throws(() => new Dni('123'), /RN-00/);
});

test('RN-01: no se puede reservar un cupo ocupado', () => {
  const cupo = nuevoCupo();
  Cita.reservar(new Dni('45678912'), cupo, false);
  assert.throws(() => Cita.reservar(new Dni('70112233'), cupo, false), /RN-01/);
});

test('RN-02: no se permite una segunda cita en la misma especialidad y día', () => {
  assert.throws(() => Cita.reservar(new Dni('45678912'), nuevoCupo(), true), /RN-02/);
});

test('RN-03: cancelar libera el cupo; una cita atendida no se cancela', () => {
  const cupo = nuevoCupo();
  const cita = Cita.reservar(new Dni('45678912'), cupo, false);
  cita.cancelar();
  assert.equal(cita.obtenerEstado(), EstadoCita.CANCELADA);
  assert.equal(cupo.estaDisponible(), true);

  const otra = Cita.reservar(new Dni('45678912'), cupo, false);
  otra.confirmarAsistencia();
  assert.throws(() => otra.cancelar(), /RN-03/);
});

// ---- Caso de uso completo con adaptadores intercambiables ----
test('reservar cita responde 201, genera QR y notifica al paciente', async () => {
  const { controller, notificador } = crearModuloCitas([nuevoCupo()], ['45678912']);
  const r = await controller.reservar({ dni: '45678912', cupoId: 'C-001' });
  assert.equal(r.estado, 201);
  assert.match((r.cuerpo as { codigoQR: string }).codigoQR, /^HAMPI-/);
  assert.equal(notificador.enviados.length, 1);
});

test('DNI no validado por RENIEC responde 409', async () => {
  const { controller } = crearModuloCitas([nuevoCupo()], ['45678912']);
  const r = await controller.reservar({ dni: '11111111', cupoId: 'C-001' });
  assert.equal(r.estado, 409);
});

test('el mismo paciente no reserva dos veces el mismo día y especialidad', async () => {
  const { controller } = crearModuloCitas([nuevoCupo('C-001'), nuevoCupo('C-002')], ['45678912']);
  await controller.reservar({ dni: '45678912', cupoId: 'C-001' });
  const r = await controller.reservar({ dni: '45678912', cupoId: 'C-002' });
  assert.equal(r.estado, 409);
});

test('Decorator: la caché evita consultas repetidas y se invalida al guardar', async () => {
  const bd = new CuposMemoriaRepository(new Map([['C-001', nuevoCupo()]]));
  const cache = new CuposCacheRepository(bd);
  await cache.buscarPorId('C-001'); // 1ra vez: va a la base de datos
  await cache.buscarPorId('C-001'); // 2da vez: responde la caché
  assert.equal(bd.consultas, 1);

  const cupo = (await cache.buscarPorId('C-001'))!;
  cupo.ocupar();
  await cache.guardar(cupo);        // invalida la caché
  await cache.buscarPorId('C-001'); // vuelve a la base de datos
  assert.equal(bd.consultas, 2);
});
