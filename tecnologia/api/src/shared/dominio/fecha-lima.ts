// Perú usa UTC-5 todo el año (sin horario de verano).
const DESFASE_LIMA_MS = -5 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Día calendario en Lima de un instante, como 'AAAA-MM-DD'. */
export function diaEnLima(instante: Date): string {
  return new Date(instante.getTime() + DESFASE_LIMA_MS).toISOString().slice(0, 10);
}

/** Instante en que empieza un día ('AAAA-MM-DD') en Lima. */
export function inicioDelDiaEnLima(dia: string): Date {
  return new Date(`${dia}T00:00:00-05:00`);
}

export function sumarDias(instante: Date, dias: number): Date {
  return new Date(instante.getTime() + dias * UN_DIA_MS);
}

export function esDiaValido(dia: unknown): dia is string {
  return typeof dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dia) && !Number.isNaN(inicioDelDiaEnLima(dia).getTime())
    && diaEnLima(inicioDelDiaEnLima(dia)) === dia;
}

/** Fecha y hora con desfase de Lima, p. ej. '2026-11-05T08:20:00-05:00'. */
export function formatoLima(instante: Date): string {
  return new Date(instante.getTime() + DESFASE_LIMA_MS).toISOString().slice(0, 19) + '-05:00';
}
