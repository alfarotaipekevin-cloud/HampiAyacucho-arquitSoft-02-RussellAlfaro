import { DatosInvalidosError } from '../../../shared/dominio/errores';

/** RI-05: al menos 8 caracteres, con al menos una letra y un número. */
export function validarContrasenaNueva(contrasena: unknown): string {
  if (typeof contrasena !== 'string' || contrasena.length < 8 || !/\p{L}/u.test(contrasena) || !/\d/.test(contrasena)) {
    throw new DatosInvalidosError('RI-05: la contraseña debe tener al menos 8 caracteres, con letras y números');
  }
  return contrasena;
}

/** RI-06: celular peruano de 9 dígitos que empieza en 9. */
export function validarCelular(celular: unknown): string {
  if (typeof celular !== 'string' || !/^9\d{8}$/.test(celular)) {
    throw new DatosInvalidosError('RI-06: el celular debe tener 9 dígitos y empezar en 9');
  }
  return celular;
}

export function validarCorreo(correo: unknown): string | null {
  if (correo === undefined || correo === null || correo === '') return null;
  if (typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new DatosInvalidosError('El correo electrónico no es válido');
  }
  return correo;
}
