import { Component } from '@angular/core';
import { TEXTOS } from '../nucleo/textos';

/** Pantalla partida de las páginas de acceso: presentación a la izquierda y tarjeta a la derecha. */
@Component({
  selector: 'app-marco-acceso',
  template: `
    <div class="acceso">
      <div class="cuerpo">
        <section class="presentacion">
          <h1>{{ textos.marca.nombre }}</h1>
          <p>{{ textos.marca.lema }}</p>
        </section>
        <section class="panel">
          <div class="tarjeta">
            <ng-content />
          </div>
        </section>
      </div>
      <footer class="pie">{{ textos.marca.pie }}</footer>
    </div>
  `,
})
export class MarcoAcceso {
  protected readonly textos = TEXTOS;
}
