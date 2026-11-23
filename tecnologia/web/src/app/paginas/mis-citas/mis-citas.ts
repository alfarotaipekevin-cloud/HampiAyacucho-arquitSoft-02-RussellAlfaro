import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarraPortal } from '../../componentes/barra-portal';
import { mensajeDeError } from '../../nucleo/api';
import { CitasService } from '../../nucleo/citas.service';
import { esFutura, fechaHoraLarga } from '../../nucleo/formato';
import { CitaResumen } from '../../nucleo/modelos';
import { ESTADOS_CITA, TEXTOS } from '../../nucleo/textos';

type Filtro = 'TODAS' | 'PROXIMAS' | 'PASADAS';

/** HU13 · Lista de las citas del paciente (spec 005, §4.2). */
@Component({
  selector: 'app-mis-citas',
  imports: [RouterLink, BarraPortal],
  templateUrl: './mis-citas.html',
})
export class MisCitas {
  private readonly citas = inject(CitasService);

  protected readonly textos = TEXTOS;
  protected readonly estados = ESTADOS_CITA;
  protected readonly fechaHoraLarga = fechaHoraLarga;

  protected readonly todas = signal<CitaResumen[]>([]);
  protected readonly filtro = signal<Filtro>('TODAS');
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    return this.todas().filter((c) => filtro === 'TODAS' || (filtro === 'PROXIMAS' ? esFutura(c.fechaHora) : !esFutura(c.fechaHora)));
  });

  protected readonly filtros: { clave: Filtro; nombre: string }[] = [
    { clave: 'TODAS', nombre: TEXTOS.misCitas.filtroTodas },
    { clave: 'PROXIMAS', nombre: TEXTOS.misCitas.proximas },
    { clave: 'PASADAS', nombre: TEXTOS.misCitas.pasadas },
  ];

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.todas.set(await this.citas.mias());
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
