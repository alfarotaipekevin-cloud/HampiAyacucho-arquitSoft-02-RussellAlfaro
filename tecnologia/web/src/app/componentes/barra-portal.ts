import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from '../nucleo/sesion.service';
import { TEXTOS } from '../nucleo/textos';

/** Cabecera común de las páginas con sesión. */
@Component({
  selector: 'app-barra-portal',
  imports: [RouterLink],
  template: `
    <header class="barra">
      <div class="interior">
        <a routerLink="/portal" class="marca">{{ textos.marca.nombre }}</a>
        <div class="fila">
          @if (usuario(); as u) {
            <span class="suave" style="color: inherit">{{ u.nombre }}</span>
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

  protected salir(): void {
    this.sesion.cerrar();
    this.router.navigate(['/ingresar']);
  }
}
