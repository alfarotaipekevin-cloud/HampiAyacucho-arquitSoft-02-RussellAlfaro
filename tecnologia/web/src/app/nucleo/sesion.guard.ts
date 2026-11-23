import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from './sesion.service';

/** Las rutas del portal y de citas necesitan sesión. */
export const sesionGuard: CanActivateFn = () => {
  const sesion = inject(SesionService);
  return sesion.haySesion() ? true : inject(Router).createUrlTree(['/ingresar']);
};

/** El ingreso y el registro no se muestran a quien ya tiene sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const sesion = inject(SesionService);
  return sesion.haySesion() ? inject(Router).createUrlTree(['/portal']) : true;
};
