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

/** Spec 007: la admisión es solo para el personal de salud; el resto vuelve al portal. */
export const personalGuard: CanActivateFn = () => {
  const sesion = inject(SesionService);
  if (!sesion.haySesion()) return inject(Router).createUrlTree(['/ingresar']);
  return sesion.usuario()?.rol === 'PERSONAL_SALUD' ? true : inject(Router).createUrlTree(['/portal']);
};
