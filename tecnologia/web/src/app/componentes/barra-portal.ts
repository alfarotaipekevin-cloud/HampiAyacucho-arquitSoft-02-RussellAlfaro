import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SesionService } from '../nucleo/sesion.service';
import { TEXTOS } from '../nucleo/textos';

/** Cabecera común de las páginas con sesión: marca, navegación y usuario. */
@Component({
  selector: 'app-barra-portal',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="barra">
      <div class="interior">
        <a routerLink="/portal" class="marca">
          <svg class="isotipo" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="20" fill="#ffffff" />
            <path d="M16 9h8v7h7v8h-7v7h-8v-7H9v-8h7z" fill="#0b6e4f" />
          </svg>
          {{ textos.marca.nombre }}
        </a>
        <nav class="navegacion" [attr.aria-label]="textos.barra.navegacion">
          <a routerLink="/portal" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">{{ textos.barra.inicio }}</a>
          @if (usuario()?.rol === 'PACIENTE') {
            <a routerLink="/citas" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">{{ textos.barra.misCitas }}</a>
          }
          @if (usuario()?.rol === 'PERSONAL_SALUD') {
            <a routerLink="/admision" routerLinkActive="activo">{{ textos.barra.admision }}</a>
          }
        </nav>
        <div class="usuario-barra">
          @if (usuario(); as u) {
            <span class="avatar" aria-hidden="true">{{ iniciales() }}</span>
            <span class="nombre-usuario">{{ u.nombre }}</span>
          }
          <button type="button" class="salir" (click)="salir()">{{ textos.portal.salir }}</button>
        </div>
      </div>
    </header>
  `,
})
export class BarraPortal {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected readonly textos = TEXTOS;
  protected readonly usuario = this.sesion.usuario;
  protected readonly iniciales = computed(() =>
    (this.usuario()?.nombre ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join(''),
  );

  protected salir(): void {
    this.sesion.cerrar();
    this.router.navigate(['/ingresar']);
  }
}
