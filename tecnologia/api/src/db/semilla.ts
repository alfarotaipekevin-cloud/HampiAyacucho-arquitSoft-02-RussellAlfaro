import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { diaEnLima, sumarDias } from '../shared/dominio/fecha-lima';
import type { DatosCupo, Especialidad, Establecimiento } from '../modules/citas';
import type { Rol } from '../shared/dominio/usuario-autenticado';

// Datos de prueba de la spec 004, §6. Todo es ficticio (constitución, P6).

export const ESPECIALIDADES: Especialidad[] = [
  { id: 'mg', nombre: 'Medicina general' },
  { id: 'ped', nombre: 'Pediatría' },
  { id: 'gin', nombre: 'Ginecología' },
  { id: 'car', nombre: 'Cardiología' },
  { id: 'odo', nombre: 'Odontología' },
];

export const ESTABLECIMIENTOS: Establecimiento[] = [
  { id: 'hra', nombre: 'Hospital Regional de Ayacucho "Miguel Ángel Mariscal Llerena"', nombreCorto: 'H. Regional Ayacucho', nivel: 'II-2', provincia: 'Huamanga', direccion: 'Av. Independencia 355, Ayacucho' },
  { id: 'hah', nombre: 'Hospital de Apoyo de Huanta', nombreCorto: 'H. Apoyo Huanta', nivel: 'II-1', provincia: 'Huanta', direccion: 'Jr. Saenz Peña s/n, Huanta' },
  { id: 'csjb', nombre: 'Centro de Salud San Juan Bautista', nombreCorto: 'C.S. San Juan Bautista', nivel: 'I-3', provincia: 'Huamanga', direccion: 'Jr. Las Retamas s/n, San Juan Bautista' },
  { id: 'csca', nombre: 'Centro de Salud Carmen Alto', nombreCorto: 'C.S. Carmen Alto', nivel: 'I-3', provincia: 'Huamanga', direccion: 'Plaza principal s/n, Carmen Alto' },
];

/** Qué atiende cada establecimiento, con su consultorio y un médico ficticio. */
export const OFERTAS = [
  { establecimientoId: 'hra', especialidadId: 'mg', consultorio: 'Consultorio 1', medico: 'Dr. Luis Gutiérrez' },
  { establecimientoId: 'hra', especialidadId: 'ped', consultorio: 'Consultorio 3', medico: 'Dra. Ana Torres' },
  { establecimientoId: 'hra', especialidadId: 'gin', consultorio: 'Consultorio 5', medico: 'Dra. Carmen Rojas' },
  { establecimientoId: 'hra', especialidadId: 'car', consultorio: 'Consultorio 8', medico: 'Dr. Jorge Medina' },
  { establecimientoId: 'hah', especialidadId: 'mg', consultorio: 'Consultorio 1', medico: 'Dr. Raúl Palomino' },
  { establecimientoId: 'hah', especialidadId: 'ped', consultorio: 'Consultorio 2', medico: 'Dra. Silvia Huaraca' },
  { establecimientoId: 'hah', especialidadId: 'gin', consultorio: 'Consultorio 4', medico: 'Dra. Elena Bautista' },
  { establecimientoId: 'csjb', especialidadId: 'mg', consultorio: 'Consultorio 1', medico: 'Dr. Pedro Ayala' },
  { establecimientoId: 'csjb', especialidadId: 'odo', consultorio: 'Consultorio 2', medico: 'Dra. Lucía Vargas' },
  { establecimientoId: 'csca', especialidadId: 'mg', consultorio: 'Consultorio 1', medico: 'Dr. Martín Cisneros' },
  { establecimientoId: 'csca', especialidadId: 'odo', consultorio: 'Consultorio 2', medico: 'Dr. Iván Quispe' },
];

/** Cuentas de otros roles, que en esta etapa se crean por seed (RI-13). Contraseña: Hampi2026. */
export const USUARIOS_DEMO: { dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; rol: Rol }[] = [
  { dni: '70000099', nombres: 'Personal de Salud', apellidoPaterno: 'Demo', apellidoMaterno: 'Hampi', rol: 'PERSONAL_SALUD' },
  { dni: '70000096', nombres: 'Personal Huanta', apellidoPaterno: 'Demo', apellidoMaterno: 'Hampi', rol: 'PERSONAL_SALUD' },
  { dni: '70000098', nombres: 'Especialista', apellidoPaterno: 'Geresa', apellidoMaterno: 'Demo', rol: 'ESPECIALISTA_GERESA' },
  { dni: '70000097', nombres: 'Administrador', apellidoPaterno: 'Hampi', apellidoMaterno: 'Demo', rol: 'ADMINISTRADOR' },
];
export const CONTRASENA_DEMO = 'Hampi2026';

/** Spec 007 · RA-01: dónde trabaja cada cuenta del personal de salud. */
export const PERSONAL_DEMO = [
  { dni: '70000099', establecimientoId: 'hra' },
  { dni: '70000096', establecimientoId: 'hah' },
];

const HORARIOS = Array.from({ length: 15 }, (_, i) => 8 * 60 + i * 20); // 08:00 a 12:40, cada 20 minutos
const DIAS_GENERADOS = 31;

/**
 * Cupos de lunes a sábado desde el día de "desde" hasta 30 días después (RN-06).
 * Los ids son deterministas (oferta + día + hora), así que volver a sembrar no duplica nada.
 * Uno de cada cuatro cupos ya está OCUPADO, para que las pruebas y la demo se vean reales.
 */
export function generarCupos(desde: Date): DatosCupo[] {
  const cupos: DatosCupo[] = [];
  for (let d = 0; d < DIAS_GENERADOS; d++) {
    const dia = diaEnLima(sumarDias(desde, d));
    if (new Date(`${dia}T12:00:00-05:00`).getUTCDay() === 0) continue; // domingo
    for (const oferta of OFERTAS) {
      HORARIOS.forEach((minutos, i) => {
        const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
        cupos.push({
          id: `${oferta.establecimientoId}-${oferta.especialidadId}-${dia.replaceAll('-', '')}-${hora.replace(':', '')}`,
          establecimientoId: oferta.establecimientoId,
          especialidadId: oferta.especialidadId,
          consultorio: oferta.consultorio,
          medico: oferta.medico,
          fechaHora: new Date(`${dia}T${hora}:00-05:00`),
          duracionMin: 20,
          estado: i % 4 === 1 ? 'OCUPADO' : 'DISPONIBLE',
        });
      });
    }
  }
  return cupos;
}

/** Siembra PostgreSQL de forma idempotente (ON CONFLICT DO NOTHING). */
export async function sembrarPostgres(bd: Pool, ahora: Date, hashContrasenaDemo: () => Promise<string>) {
  const cliente = await bd.connect();
  try {
    await cliente.query('BEGIN');
    for (const e of ESPECIALIDADES) {
      await cliente.query('INSERT INTO especialidades (id, nombre) VALUES ($1, $2) ON CONFLICT DO NOTHING', [e.id, e.nombre]);
    }
    for (const e of ESTABLECIMIENTOS) {
      await cliente.query(
        `INSERT INTO establecimientos (id, nombre, nombre_corto, nivel, provincia, direccion)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [e.id, e.nombre, e.nombreCorto, e.nivel, e.provincia, e.direccion],
      );
    }
    for (const o of OFERTAS) {
      await cliente.query('INSERT INTO ofertas VALUES ($1, $2) ON CONFLICT DO NOTHING', [o.establecimientoId, o.especialidadId]);
    }

    const cupos = generarCupos(ahora);
    for (let i = 0; i < cupos.length; i += 500) {
      const lote = cupos.slice(i, i + 500);
      await cliente.query(
        `INSERT INTO cupos (id, establecimiento_id, especialidad_id, consultorio, medico, fecha_hora, duracion_min, estado)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::timestamptz[], $7::int[], $8::text[])
         ON CONFLICT DO NOTHING`,
        [lote.map((c) => c.id), lote.map((c) => c.establecimientoId), lote.map((c) => c.especialidadId),
          lote.map((c) => c.consultorio), lote.map((c) => c.medico), lote.map((c) => c.fechaHora),
          lote.map((c) => c.duracionMin), lote.map((c) => c.estado)],
      );
    }

    const hash = await hashContrasenaDemo();
    for (const u of USUARIOS_DEMO) {
      await cliente.query(
        `INSERT INTO usuarios (id, dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, celular, hash_contrasena, rol)
         VALUES ($1, $2, $3, $4, $5, '1988-08-08', '999999999', $6, $7) ON CONFLICT (dni) DO NOTHING`,
        [randomUUID(), u.dni, u.nombres, u.apellidoPaterno, u.apellidoMaterno, hash, u.rol],
      );
    }
    for (const p of PERSONAL_DEMO) {
      await cliente.query('INSERT INTO personal_establecimiento VALUES ($1, $2) ON CONFLICT DO NOTHING', [p.dni, p.establecimientoId]);
    }
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}
