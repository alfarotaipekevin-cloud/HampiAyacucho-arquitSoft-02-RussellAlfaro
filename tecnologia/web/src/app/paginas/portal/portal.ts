import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarraPortal } from '../../componentes/barra-portal';
import { mensajeDeError } from '../../nucleo/api';
import { IdentidadService } from '../../nucleo/identidad.service';
import { TarjetaModulo } from '../../nucleo/modelos';
import { SesionService } from '../../nucleo/sesion.service';
import { TEXTOS } from '../../nucleo/textos';

/** HU12 · Portal con una tarjeta por módulo; solo Citas está activo (spec 003). */
@Component({
  selector: 'app-portal',
  imports: [RouterLink, BarraPortal],
  templateUrl: './portal.html',
})
export class Portal {
  private readonly identidad = inject(IdentidadService);

  protected readonly textos = TEXTOS;
  protected readonly usuario = inject(SesionService).usuario;
  protected readonly modulos = signal<TarjetaModulo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.modulos.set(await this.identidad.modulos());
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
