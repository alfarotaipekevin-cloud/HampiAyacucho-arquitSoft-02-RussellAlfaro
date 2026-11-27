import { estadoDemo } from '../../db/citas-demo';

// Citas de demostración (CITAS_DEMO=true): su estado avanza con la hora del día.
describe('Citas de demostración del día', () => {
  const cita = new Date('2026-11-04T10:00:00-05:00');
  const a = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00-05:00`);

  test('una cita lejana queda por llegar', () => {
    expect(estadoDemo(cita, a('08:00'), 0)).toEqual({ estado: 'RESERVADA', llegadaEn: null });
  });

  test('cerca de la hora el paciente ya llegó y espera, con una llegada anterior al momento actual', () => {
    const r = estadoDemo(cita, a('09:50'), 1);
    expect(r.estado).toBe('RESERVADA');
    expect(r.llegadaEn!.getTime()).toBeLessThanOrEqual(a('09:50').getTime());
  });

  test('pasada la tolerancia casi todas se atendieron y una de cada cuatro no llegó', () => {
    expect(estadoDemo(cita, a('11:00'), 0).estado).toBe('ATENDIDA');
    expect(estadoDemo(cita, a('11:00'), 3)).toEqual({ estado: 'RESERVADA', llegadaEn: null });
  });
});
