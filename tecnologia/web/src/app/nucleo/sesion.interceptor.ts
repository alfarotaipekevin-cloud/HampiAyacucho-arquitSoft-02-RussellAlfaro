import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SesionService } from './sesion.service';

/**
 * Añade el token a cada llamada y, si la API responde 401, cierra la sesión
 * y manda al ingreso con el aviso "Tu sesión expiró" (CA-002-12).
 */
export const sesionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.token;
  const conToken = token ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : peticion;

  return siguiente(conToken).pipe(
    catchError((e: unknown) => {
      // El 401 del propio ingreso es "contraseña incorrecta", no una sesión vencida.
      const esIngreso = peticion.url.endsWith('/identidad/sesion');
      if (e instanceof HttpErrorResponse && e.status === 401 && !esIngreso) {
        sesion.cerrar();
        router.navigate(['/ingresar'], { queryParams: { expirada: '1' } });
      }
      return throwError(() => e);
    }),
  );
};
