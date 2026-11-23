import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BarraPortal } from '../../componentes/barra-portal';
import { mensajeDeError } from '../../nucleo/api';
import { CitasService } from '../../nucleo/citas.service';
import { esFutura, fechaHoraLarga } from '../../nucleo/formato';
import { Ficha as FichaCita } from '../../nucleo/modelos';
import { ESTADOS_CITA, TEXTOS } from '../../nucleo/textos';

/** HU13 · Ficha de la cita con el QR, descarga en PDF y cancelación (spec 005, §4.2). */
@Component({
  selector: 'app-ficha',
  imports: [RouterLink, BarraPortal],
  templateUrl: './ficha.html',
})
export class Ficha {
  private readonly citas = inject(CitasService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly textos = TEXTOS;
  protected readonly estados = ESTADOS_CITA;
  protected readonly fechaHoraLarga = fechaHoraLarga;

  protected readonly ficha = signal<FichaCita | null>(null);
  protected readonly cargando = signal(true);
  protected readonly descargando = signal(false);
  protected readonly cancelando = signal(false);
  protected readonly error = signal('');
  protected readonly cancelada = signal(false);
  /** Al venir de la reserva se muestra "Tu cita está reservada" y el aviso del SMS. */
  protected readonly recienReservada = signal(false);

  constructor() {
    const estado = inject(Router).getCurrentNavigation()?.extras.state as { ficha?: FichaCita; recienReservada?: boolean } | undefined;
    if (estado?.ficha) {
      this.ficha.set(estado.ficha);
      this.recienReservada.set(estado.recienReservada === true);
      this.cargando.set(false);
    } else {
      this.cargar();
    }
  }

  protected get sePuedeCancelar(): boolean {
    const f = this.ficha();
    return f !== null && f.estado === 'RESERVADA' && esFutura(f.fechaHora);
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.ficha.set(await this.citas.ficha(String(this.ruta.snapshot.paramMap.get('citaId'))));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async descargar(): Promise<void> {
    const f = this.ficha();
    if (!f) return;
    this.error.set('');
    this.descargando.set(true);
    try {
      const pdf = await this.citas.fichaPdf(f.citaId);
      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `ficha-${f.codigo}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.descargando.set(false);
    }
  }

  protected async cancelar(): Promise<void> {
    const f = this.ficha();
    if (!f || !confirm(TEXTOS.ficha.confirmarCancelar)) return;
    this.error.set('');
    this.cancelando.set(true);
    try {
      const r = await this.citas.cancelar(f.citaId);
      this.ficha.set({ ...f, estado: r.estado });
      this.cancelada.set(true);
      this.recienReservada.set(false);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cancelando.set(false);
    }
  }
}
