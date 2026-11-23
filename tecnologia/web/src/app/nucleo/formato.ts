const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

/** Las fechas de la API vienen en hora de Lima (-05:00); se leen tal cual, sin pasar por la zona del navegador. */
const partes = (iso: string) => ({
  anio: Number(iso.slice(0, 4)),
  mes: Number(iso.slice(5, 7)),
  dia: Number(iso.slice(8, 10)),
  hora: iso.slice(11, 16),
});

/** '2026-11-05' → 'jueves 5 de noviembre' */
export function diaLargo(fecha: string): string {
  const { anio, mes, dia } = partes(fecha);
  const nombre = DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${nombre} ${dia} de ${MESES[mes - 1]}`;
}

/** '2026-11-05T08:00:00-05:00' → 'jueves 5 de noviembre, 08:00' */
export function fechaHoraLarga(iso: string): string {
  return `${diaLargo(iso.slice(0, 10))}, ${partes(iso).hora}`;
}

/** '2026-11-05T08:00:00-05:00' → '05/11/2026 08:00' */
export function fechaHoraCorta(iso: string): string {
  const { anio, mes, dia, hora } = partes(iso);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio} ${hora}`;
}

/** '2026-11-05T08:00:00-05:00' → '08:00' */
export const hora = (iso: string) => iso.slice(11, 16);

export const esFutura = (iso: string) => new Date(iso).getTime() >= Date.now();
