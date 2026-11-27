import { Cita } from '../../modules/citas/dominio/cita';
import { Cupo } from '../../modules/citas/dominio/cupo';
import { EstadoCita } from '../../modules/citas/dominio/estado-cita';
import { textoSmsCita } from '../../modules/citas/infraestructura/adaptadores';
import { validarCelular, validarContrasenaNueva } from '../../modules/identidad/dominio/credenciales';
import { Usuario } from '../../modules/identidad/dominio/usuario';
import { Dni } from '../../shared/dominio/dni';
import { diaEnLima, esDiaValido, formatoLima, inicioDelDiaEnLima } from '../../shared/dominio/fecha-lima';

// Dominio puro: sin HTTP, sin base de datos y sin PIDE (EQ-06).

const AHORA = new Date('2026-11-04T10:00:00-05:00');
const nuevoCupo = (fechaHora = new Date('2026-11-05T08:00:00-05:00')) =>
  new Cupo({ id: 'c1', establecimientoId: 'hra', especialidadId: 'ped', consultorio: 'Consultorio 3', medico: 'Dra. Ana Torres', fechaHora, duracionMin: 20, estado: 'DISPONIBLE' });
const contexto = (extra: Partial<Parameters<typeof Cita.reservar>[0]> = {}) => ({
  pacienteId: 'p1', dni: new Dni('70000001'), cupo: nuevoCupo(), ahora: AHORA,
  yaTieneCitaEseDiaEnLaEspecialidad: false, citasReservadasDelPaciente: 0, ...extra,
});

describe('Cita', () => {
  test('reservar ocupa el cupo y genera un código HAMPI-XXXXXXXX', () => {
    const c = contexto();
    const cita = Cita.reservar(c);
    expect(cita.estado).toBe(EstadoCita.RESERVADA);
    expect(cita.codigo).toMatch(/^HAMPI-[0-9A-F]{8}$/);
    expect(c.cupo.estaDisponible()).toBe(false);
  });

  test('RN-01, RN-02, RN-09 y RN-10 se validan antes de ocupar el cupo', () => {
    const ocupado = nuevoCupo();
    ocupado.ocupar();
    const casos: [Parameters<typeof contexto>[0], RegExp][] = [
      [{ cupo: ocupado }, /RN-01/],
      [{ yaTieneCitaEseDiaEnLaEspecialidad: true }, /RN-02/],
      [{ cupo: nuevoCupo(new Date('2026-11-04T09:00:00-05:00')) }, /RN-09/],
      [{ citasReservadasDelPaciente: 3 }, /RN-10/],
    ];
    for (const [extra, regla] of casos) {
      const c = contexto(extra);
      const libreAntes = c.cupo.estaDisponible();
      expect(() => Cita.reservar(c)).toThrow(regla);
      expect(c.cupo.estaDisponible()).toBe(libreAntes);
    }
  });

  test('RN-03 y RN-04: cancelar libera el cupo; una cita atendida no se cancela', () => {
    const c = contexto();
    const cita = Cita.reservar(c);
    cita.cancelar(AHORA);
    expect(cita.estado).toBe(EstadoCita.CANCELADA);
    expect(c.cupo.estaDisponible()).toBe(true);
    expect(() => cita.cancelar(AHORA)).toThrow(expect.objectContaining({ codigo: 'CITA_NO_RESERVADA' }));

    const otra = Cita.reservar(contexto());
    otra.confirmarAsistencia();
    expect(() => otra.cancelar(AHORA)).toThrow(/RN-03/);
    expect(() => otra.confirmarAsistencia()).toThrow(/RN-04/);
  });

  test('RN-15: se puede cancelar hasta 2 horas antes, no después', () => {
    const cita = Cita.reservar(contexto());
    const hora = cita.cupo.fechaHora.getTime();
    expect(() => cita.cancelar(new Date(hora - 2 * 3600_000 + 60_000))).toThrow(expect.objectContaining({ codigo: 'FUERA_DE_PLAZO' }));
    expect(cita.cupo.estaDisponible()).toBe(false);
    cita.cancelar(new Date(hora - 2 * 3600_000));
    expect(cita.estado).toBe(EstadoCita.CANCELADA);
  });
});

describe('Usuario', () => {
  const persona = { dni: '70000001', nombres: 'María Elena', apellidoPaterno: 'Quispe', apellidoMaterno: 'Huamán', fechaNacimiento: '1990-04-15' };

  test('RI-13: una cuenta creada desde la web es PACIENTE', () => {
    expect(Usuario.registrar(persona, '987654321', null, 'hash').rol).toBe('PACIENTE');
  });

  test('RI-08: se bloquea 15 minutos al quinto intento fallido', () => {
    const u = Usuario.registrar(persona, '987654321', null, 'hash');
    for (let i = 0; i < 4; i++) u.registrarIntentoFallido(AHORA);
    expect(u.estaBloqueado(AHORA)).toBe(false);
    u.registrarIntentoFallido(AHORA);
    expect(u.estaBloqueado(AHORA)).toBe(true);
    expect(u.estaBloqueado(new Date(AHORA.getTime() + 15 * 60_000))).toBe(false);
  });

  test('RI-05 y RI-06: contraseña y celular', () => {
    expect(validarContrasenaNueva('Hampi2026')).toBe('Hampi2026');
    for (const mala of ['corta1', '12345678', 'sinnumeros', 42]) expect(() => validarContrasenaNueva(mala)).toThrow();
    expect(validarCelular('987654321')).toBe('987654321');
    for (const malo of ['87654321', '887654321', '9876543210']) expect(() => validarCelular(malo)).toThrow();
  });
});

describe('Fechas en Lima (UTC-5)', () => {
  test('el día en Lima puede ser distinto al día en UTC', () => {
    expect(diaEnLima(new Date('2026-11-05T03:00:00Z'))).toBe('2026-11-04');
    expect(inicioDelDiaEnLima('2026-11-05').toISOString()).toBe('2026-11-05T05:00:00.000Z');
    expect(formatoLima(new Date('2026-11-05T13:20:00Z'))).toBe('2026-11-05T08:20:00-05:00');
  });

  test('esDiaValido rechaza fechas imposibles', () => {
    expect(esDiaValido('2026-11-05')).toBe(true);
    for (const mala of ['2026-02-30', '05/11/2026', '2026-13-01', undefined]) expect(esDiaValido(mala)).toBe(false);
  });
});

describe('SMS de la cita', () => {
  test('sigue el formato de la spec 005, sin tildes y en 160 caracteres como máximo', () => {
    const texto = textoSmsCita({
      celular: '987654321', codigo: 'HAMPI-1A2B3C4D', especialidad: 'Pediatría', establecimiento: 'H. Regional Ayacucho',
      fechaHora: new Date('2026-11-05T08:20:00-05:00'), consultorio: 'Consultorio 3',
    });
    expect(texto).toBe('Hampi: cita HAMPI-1A2B3C4D, Pediatria, H. Regional Ayacucho, 05/11 08:20, Cons. 3. Llega 20 min antes con tu DNI.');
    expect(texto.length <= 160).toBeTruthy();
  });

  test('spec 008: el SMS de una cita reprogramada lo dice y no pasa de 160 caracteres', () => {
    const texto = textoSmsCita({
      celular: '987654321', codigo: 'HAMPI-1A2B3C4D', especialidad: 'Medicina general', establecimiento: 'C.S. San Juan Bautista',
      fechaHora: new Date('2026-11-05T12:40:00-05:00'), consultorio: 'Consultorio 1', reprogramada: true,
    });
    expect(texto).toMatch(/^Hampi: cita reprogramada HAMPI-1A2B3C4D, Medicina general, .* 05\/11 12:40, .*DNI\.$/);
    expect(texto.length <= 160).toBeTruthy();
  });
});

describe('Spec 008 · Cita.reprogramar', () => {
  const cupo = (id: string, fechaHora: string, extra: Partial<{ especialidadId: string; establecimientoId: string }> = {}) =>
    new Cupo({ id, establecimientoId: 'hra', especialidadId: 'ped', consultorio: 'Consultorio 3', medico: 'Dra. Ana Torres',
      fechaHora: new Date(fechaHora), duracionMin: 20, estado: 'DISPONIBLE', ...extra });
  const LIMITE = new Date('2026-12-05T00:00:00-05:00');
  const reservada = () => Cita.reservar(contexto({ cupo: cupo('a', '2026-11-05T08:00:00-05:00') }));
  const ctx = (nuevo: Cupo, extra: object = {}) => ({ nuevoCupo: nuevo, ahora: AHORA, limiteApertura: LIMITE, yaTieneOtraCitaEseDia: false, ...extra });

  test('mueve la cita, conserva el código, libera el cupo anterior y cuenta la reprogramación', () => {
    const cita = reservada();
    const codigo = cita.codigo;
    const nuevo = cupo('b', '2026-11-06T09:00:00-05:00');
    const anterior = cita.reprogramar(ctx(nuevo));
    expect(anterior.id).toBe('a');
    expect(anterior.estaDisponible()).toBe(true);
    expect(nuevo.estaDisponible()).toBe(false);
    expect(cita.cupo.id).toBe('b');
    expect(cita.codigo).toBe(codigo);
    expect(cita.reprogramaciones).toBe(1);
    expect(cita.reprogramacionesRestantes).toBe(1);
    expect(cita.notificacion).toBe('PENDIENTE');
  });

  test('cada regla rechaza sin tocar los cupos ni la cita', () => {
    const ocupado = cupo('o', '2026-11-06T09:00:00-05:00');
    ocupado.ocupar();
    const casos: [() => Cita, Cupo, object, string][] = [
      [reservada, cupo('b', '2026-11-06T09:00:00-05:00', { especialidadId: 'mg' }), {}, 'OTRO_SERVICIO'],
      [reservada, cupo('b', '2026-11-06T09:00:00-05:00', { establecimientoId: 'hah' }), {}, 'OTRO_SERVICIO'],
      [reservada, cupo('a', '2026-11-05T08:00:00-05:00'), {}, 'MISMO_CUPO'],
      [reservada, cupo('b', '2026-11-04T09:00:00-05:00'), {}, 'CUPO_VENCIDO'],
      [reservada, cupo('b', '2026-12-05T08:00:00-05:00'), {}, 'FUERA_DE_APERTURA'],
      [reservada, ocupado, {}, 'CUPO_NO_DISPONIBLE'],
      [reservada, cupo('b', '2026-11-06T09:00:00-05:00'), { yaTieneOtraCitaEseDia: true }, 'CITA_DUPLICADA'],
      [reservada, cupo('b', '2026-11-06T09:00:00-05:00'), { ahora: new Date('2026-11-05T06:30:00-05:00') }, 'FUERA_DE_PLAZO'],
      [() => { const c = reservada(); c.registrarLlegada(new Date('2026-11-05T07:40:00-05:00'), 'hra'); return c; },
        cupo('b', '2026-11-06T09:00:00-05:00'), { ahora: new Date('2026-11-05T05:00:00-05:00') }, 'LLEGADA_YA_REGISTRADA'],
      [() => { const c = reservada(); c.confirmarAsistencia(); return c; }, cupo('b', '2026-11-06T09:00:00-05:00'), {}, 'CITA_ATENDIDA'],
      [() => { const c = reservada(); c.cancelar(AHORA); return c; }, cupo('b', '2026-11-06T09:00:00-05:00'), {}, 'CITA_NO_RESERVADA'],
    ];
    for (const [crear, nuevo, extra, codigo] of casos) {
      const cita = crear();
      const libreAntes = nuevo.estaDisponible();
      expect(() => cita.reprogramar(ctx(nuevo, extra))).toThrow(expect.objectContaining({ codigo }));
      expect(nuevo.estaDisponible()).toBe(libreAntes);
      expect(cita.reprogramaciones).toBe(0);
    }
  });

  test('RR-03: la tercera reprogramación se rechaza', () => {
    const cita = reservada();
    cita.reprogramar(ctx(cupo('b', '2026-11-06T09:00:00-05:00')));
    cita.reprogramar(ctx(cupo('c', '2026-11-07T09:00:00-05:00')));
    expect(cita.reprogramacionesRestantes).toBe(0);
    expect(() => cita.reprogramar(ctx(cupo('d', '2026-11-09T09:00:00-05:00')))).toThrow(expect.objectContaining({ codigo: 'LIMITE_REPROGRAMACIONES' }));
  });
});
