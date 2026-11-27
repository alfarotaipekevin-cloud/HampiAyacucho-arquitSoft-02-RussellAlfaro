import { Routes } from '@angular/router';
import { invitadoGuard, personalGuard, sesionGuard } from './nucleo/sesion.guard';

/** La web entra siempre por el ingreso; lo demás necesita sesión. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ingresar' },
  {
    path: 'ingresar',
    canActivate: [invitadoGuard],
    title: 'Ingresar · Hampi Ayacucho',
    loadComponent: () => import('./paginas/ingresar/ingresar').then((m) => m.Ingresar),
  },
  {
    path: 'crear-cuenta',
    canActivate: [invitadoGuard],
    title: 'Crear cuenta · Hampi Ayacucho',
    loadComponent: () => import('./paginas/crear-cuenta/crear-cuenta').then((m) => m.CrearCuenta),
  },
  {
    path: 'recuperar',
    canActivate: [invitadoGuard],
    title: 'Recuperar contraseña · Hampi Ayacucho',
    loadComponent: () => import('./paginas/recuperar/recuperar').then((m) => m.Recuperar),
  },
  {
    path: 'portal',
    canActivate: [sesionGuard],
    title: 'Portal · Hampi Ayacucho',
    loadComponent: () => import('./paginas/portal/portal').then((m) => m.Portal),
  },
  {
    path: 'citas',
    canActivate: [sesionGuard],
    title: 'Mis citas · Hampi Ayacucho',
    loadComponent: () => import('./paginas/mis-citas/mis-citas').then((m) => m.MisCitas),
  },
  {
    path: 'citas/reservar',
    canActivate: [sesionGuard],
    title: 'Reservar una cita · Hampi Ayacucho',
    loadComponent: () => import('./paginas/reservar/reservar').then((m) => m.Reservar),
  },
  {
    path: 'citas/:citaId',
    canActivate: [sesionGuard],
    title: 'Ficha de la cita · Hampi Ayacucho',
    loadComponent: () => import('./paginas/ficha/ficha').then((m) => m.Ficha),
  },
  {
    path: 'admision',
    canActivate: [personalGuard],
    title: 'Admisión de citas · Hampi Ayacucho',
    loadComponent: () => import('./paginas/admision/admision').then((m) => m.Admision),
  },
  {
    path: 'sala-espera',
    canActivate: [personalGuard],
    title: 'Sala de espera · Hampi Ayacucho',
    loadComponent: () => import('./paginas/sala-espera/sala-espera').then((m) => m.SalaEspera),
  },
  { path: '**', redirectTo: 'ingresar' },
];
