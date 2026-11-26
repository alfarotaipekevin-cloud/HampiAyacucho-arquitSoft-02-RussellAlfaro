import { Component } from '@angular/core';
import { TEXTOS } from '../nucleo/textos';

/** Pantalla de acceso: foto del hospital a pantalla completa, presentación a la izquierda y tarjeta flotante a la derecha. */
@Component({
  selector: 'app-marco-acceso',
  template: `
    <div class="acceso">
      <div class="cuerpo">
        <section class="presentacion" [attr.aria-label]="textos.marca.nombre">
          <div class="marca-acceso">
            <svg class="isotipo" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="20" fill="#ffffff" />
              <path d="M16 9h8v7h7v8h-7v7h-8v-7H9v-8h7z" fill="#0b6e4f" />
            </svg>
            <span>{{ textos.marca.nombre }}</span>
          </div>

          <div class="mensaje">
            <span class="etiqueta-acceso">{{ textos.marca.etiqueta }}</span>
            <h1>{{ textos.marca.titular }} <em>{{ textos.marca.titularResalte }}</em></h1>
            <p class="lema">{{ textos.marca.lema }}</p>

            <ol class="como-funciona">
              @for (paso of textos.marca.pasos; track paso.titulo) {
                <li>
                  <strong>{{ paso.titulo }}</strong>
                  <span>{{ paso.detalle }}</span>
                </li>
              }
            </ol>
          </div>

          <div class="red">
            <img src="img/logo-hospital-regional.jpg" alt="" width="48" height="48" />
            <p>{{ textos.marca.red }}</p>
          </div>
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
