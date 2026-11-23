// Tipos del registro civil (RENIEC) que comparten Identidad y Citas.

export interface PersonaRegistroCivil {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string; // AAAA-MM-DD
}

export type ResultadoConsultaDni =
  | { estado: 'VALIDO'; persona: PersonaRegistroCivil }
  | { estado: 'RESTRINGIDO'; motivo: string; persona: PersonaRegistroCivil }
  | { estado: 'NO_EXISTE' };
