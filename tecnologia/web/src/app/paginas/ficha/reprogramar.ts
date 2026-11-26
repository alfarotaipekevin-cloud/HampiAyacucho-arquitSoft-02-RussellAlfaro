import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { mensajeDeError } from '../../nucleo/api';
import { CitasService } from '../../nucleo/citas.service';
import { diaLargo, fechaHoraCorta, hora, partesDelDia } from '../../nucleo/formato';
import { Cupo, Ficha } from '../../nucleo/modelos';
import { TEXTOS } from '../../nucleo/textos';

/**
 * Spec 008 · Panel para reprogramar la cita desde su ficha.
 * Muestra los días y horas libres del mismo servicio; la API valida todas las reglas (RR-01 a RR-08).
 */
@Component({
  selector: 'app-reprogramar',
  template: `
    <section class="tarjeta reprogramar" aria-labelledby="titulo-reprogramar">
      <h2 id="titulo-reprogramar">{{ t.titulo }}</h2>
      <p class="suave">{{ ficha().especialidad }} · {{ ficha().establecimiento }}. {{ t.bajada }}</p>

      @if (error()) {
        <p class="aviso error" role="alert">{{ error() }}</p>
      }

      <h3>{{ t.dia }}</h3>
      @if (fechas() === null) {
        <p class="suave">{{ textos.comun.cargando }}</p>
      } @else if (fechas()!.length === 0) {
        <p class="aviso info">{{ t.sinDias }}</p>
      }
      <div class="opciones dias">
        @for (f of fechas() ?? []; track f) {
          <button type="button" class="opcion dia-boton" [attr.aria-pressed]="fecha() === f" [attr.aria-label]="diaLargo(f)" (click)="elegirFecha(f)">
            <span class="semana">{{ partesDelDia(f).semana }}</span>
            <span class="numero">{{ partesDelDia(f).dia }}</span>
            <span class="mes">{{ partesDelDia(f).mes }}</span>
          </button>
        }
      </div>

      @if (fecha()) {
        <h3>{{ t.hora }} · {{ diaLargo(fecha()) }}</h3>
        @if (cupos() === null) {
          <p class="suave">{{ textos.comun.cargando }}</p>
        } @else if (cupos()!.length === 0) {
          <p class="aviso info">{{ t.sinHoras }}</p>
        }
        <div class="opciones horas">
          @for (c of cupos() ?? []; track c.id) {
            <button type="button" class="opcion hora-boton" [attr.aria-pressed]="cupo()?.id === c.id" (click)="cupo.set(c)">{{ hora(c.fechaHora) }}</button>
          }
        </div>
      }

      <div class="cambio-fecha" [class.listo]="cupo()">
        <span><small>{{ t.actual }}</small><s>{{ fechaHoraCorta(ficha().fechaHora) }}</s></span>
        <span aria-hidden="true" class="flecha">→</span>
        <span><small>{{ t.nueva }}</small><b>{{ cupo() ? fechaHoraCorta(cupo()!.fechaHora) : '—' }}</b></span>
      </div>

      <div class="acciones-ficha">
        <button type="button" class="primario" [disabled]="!cupo() || enviando()" (click)="confirmar()">
          {{ enviando() ? t.confirmando : t.confirmar }}
        </button>
        <button type="button" class="secundario" (click)="cerrar.emit()">{{ t.cerrar }}</button>
      </div>
      <p class="nota-reglas">{{ t.reglas }} {{ t.restantes(ficha().reprogramacionesRestantes) }}</p>
    </section>
  `,
})
export class Reprogramar implements OnInit {
  private readonly citas = inject(CitasService);

  readonly ficha = input.required<Ficha>();
  readonly reprogramada = output<Ficha>();
  readonly cerrar = output<void>();

  protected readonly t = TEXTOS.reprogramar;
  protected readonly textos = TEXTOS;
  protected readonly diaLargo = diaLargo;
  protected readonly partesDelDia = partesDelDia;
  protected readonly hora = hora;
  protected readonly fechaHoraCorta = fechaHoraCorta;

  protected readonly fechas = signal<string[] | null>(null);
  protected readonly fecha = signal('');
  protected readonly cupos = signal<Cupo[] | null>(null);
  protected readonly cupo = signal<Cupo | null>(null);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  private readonly servicio = computed(() => [this.ficha().especialidadId, this.ficha().establecimientoId] as const);

  ngOnInit(): void {
    this.cargarFechas();
  }

  private async cargarFechas(): Promise<void> {
    try {
      this.fechas.set(await this.citas.fechas(...this.servicio()));
    } catch (e) {
      this.fechas.set([]);
      this.error.set(mensajeDeError(e));
    }
  }

  protected async elegirFecha(fecha: string): Promise<void> {
    this.fecha.set(fecha);
    this.cupo.set(null);
    this.cupos.set(null);
    try {
      const libres = await this.citas.cupos(...this.servicio(), fecha);
      if (this.fecha() === fecha) this.cupos.set(libres);
    } catch (e) {
      this.cupos.set([]);
      this.error.set(mensajeDeError(e));
    }
  }

  protected async confirmar(): Promise<void> {
    const c = this.cupo();
    if (!c) return;
    this.error.set('');
    this.enviando.set(true);
    try {
      this.reprogramada.emit(await this.citas.reprogramar(this.ficha().citaId, c.id));
    } catch (e) {
      this.error.set(mensajeDeError(e));
      // Si otro paciente ganó el horario, se recargan las horas libres de ese día.
      await this.elegirFecha(this.fecha());
    } finally {
      this.enviando.set(false);
    }
  }
}
