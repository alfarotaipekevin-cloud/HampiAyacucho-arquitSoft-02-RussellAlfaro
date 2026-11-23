import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarraPortal } from '../../componentes/barra-portal';
import { mensajeDeError } from '../../nucleo/api';
import { CitasService } from '../../nucleo/citas.service';
import { diaLargo, esFutura, hora } from '../../nucleo/formato';
import { IdentidadService } from '../../nucleo/identidad.service';
import { CitaResumen, TarjetaModulo } from '../../nucleo/modelos';
import { SesionService } from '../../nucleo/sesion.service';
import { TEXTOS } from '../../nucleo/textos';

const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];

/** HU12 · Portal: saludo, próxima cita del paciente, accesos rápidos y una tarjeta por módulo (spec 003). */
@Component({
  selector: 'app-portal',
  imports: [RouterLink, BarraPortal],
  templateUrl: './portal.html',
})
export class Portal {
  private readonly identidad = inject(IdentidadService);
  private readonly citas = inject(CitasService);

  protected readonly textos = TEXTOS;
  protected readonly t = TEXTOS.portal;
  protected readonly usuario = inject(SesionService).usuario;
  protected readonly modulos = signal<TarjetaModulo[]>([]);
  protected readonly misCitas = signal<CitaResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly esPaciente = computed(() => this.usuario()?.rol === 'PACIENTE');
  protected readonly hoy = diaLargo(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()));

  protected readonly proximas = computed(() =>
    this.misCitas()
      .filter((c) => c.estado === 'RESERVADA' && esFutura(c.fechaHora))
      .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
  );
  protected readonly proxima = computed(() => this.proximas()[0] ?? null);
  protected readonly disponibles = computed(() =>
    Math.max(0, 3 - this.misCitas().filter((c) => c.estado === 'RESERVADA').length),
  );
  protected readonly atendidas = computed(() => this.misCitas().filter((c) => c.estado === 'ATENDIDA').length);

  protected readonly diaLargo = diaLargo;
  protected readonly hora = hora;
  protected readonly diaNumero = (iso: string) => Number(iso.slice(8, 10));
  protected readonly mesCorto = (iso: string) => MESES_CORTOS[Number(iso.slice(5, 7)) - 1];

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [modulos, citas] = await Promise.all([
        this.identidad.modulos(),
        this.esPaciente() ? this.citas.mias().catch(() => [] as CitaResumen[]) : Promise.resolve([] as CitaResumen[]),
      ]);
      this.modulos.set(modulos);
      this.misCitas.set(citas);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
