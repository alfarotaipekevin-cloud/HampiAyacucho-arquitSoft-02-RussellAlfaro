import { ErrorAplicacion, ReglaNegocioError } from '../../../shared/dominio/errores';

export const cuentaExistente = () =>
  new ReglaNegocioError('CUENTA_EXISTENTE', 'RI-04: este DNI ya tiene una cuenta en Hampi');

/** RI-07: el mismo mensaje para un DNI sin cuenta y para una contraseña incorrecta. */
export const credencialesInvalidas = () =>
  new ErrorAplicacion('NO_AUTENTICADO', 'CREDENCIALES_INVALIDAS', 'Número de documento o contraseña incorrectos');

export const cuentaBloqueada = (hasta: Date) =>
  new ErrorAplicacion(
    'BLOQUEADO',
    'CUENTA_BLOQUEADA',
    'RI-08: tu cuenta está bloqueada por varios intentos fallidos. Intenta nuevamente en 15 minutos.',
    { desbloqueoEn: hasta.toISOString() },
  );
