import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BarraPortal } from '../../componentes/barra-portal';
import { mensajeDeError } from '../../nucleo/api';
import { CitasService } from '../../nucleo/citas.service';
import { diaLargo, fechaHoraLarga, hora, partesDelDia, turno } from '../../nucleo/formato';
import { Cupo, Especialidad, Establecimiento } from '../../nucleo/modelos';
import { TEXTOS } from '../../nucleo/textos';

/** HU02 · Reservar una cita en cuatro pasos (specs 004 y 005). */
@Component({
  selector: 'app-reservar',
  imports: [RouterLink, BarraPortal],
  templateUrl: './reservar.html',
})
export class Reservar {
  private readonly citas = inject(CitasService);
  private readonly router = inject(Router);

  protected readonly textos = TEXTOS;
  protected readonly diaLargo = diaLargo;
  protected readonly fechaHoraLarga = fechaHoraLarga;
  protected readonly hora = hora;
  protected readonly partesDelDia = partesDelDia;
  protected readonly iconos: Record<string, string | undefined> = { mg: '🩺', ped: '👶', gin: '🤰', car: '❤️', odo: '🦷' };

  protected readonly paso = signal(0);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly establecimientos = signal<Establecimiento[]>([]);
  protected readonly fechas = signal<string[]>([]);
  protected readonly cupos = signal<Cupo[]>([]);

  protected readonly especialidad = signal<Especialidad | null>(null);
  protected readonly establecimiento = signal<Establecimiento | null>(null);
  protected readonly fecha = signal('');
  protected readonly cupo = signal<Cupo | null>(null);

  protected readonly cuposManana = computed(() => this.cupos().filter((c) => turno(c.fechaHora) === 'manana'));
  protected readonly cuposTarde = computed(() => this.cupos().filter((c) => turno(c.fechaHora) === 'tarde'));

  protected readonly resumen = computed(() => ({
    especialidad: this.especialidad()?.nombre ?? '',
    establecimiento: this.establecimiento()?.nombre ?? '',
    cupo: this.cupo(),
  }));

  constructor() {
    this.cargar(async () => this.especialidades.set(await this.citas.especialidades()));
  }

  /** Ejecuta una carga mostrando "Cargando..." y dejando el error a la vista si falla. */
  private async cargar(accion: () => Promise<void>, limpiarError = true): Promise<boolean> {
    if (limpiarError) this.error.set('');
    this.cargando.set(true);
    try {
      await accion();
      return true;
    } catch (e) {
      this.error.set(mensajeDeError(e));
      return false;
    } finally {
      this.cargando.set(false);
    }
  }

  protected async elegirEspecialidad(especialidad: Especialidad): Promise<void> {
    this.especialidad.set(especialidad);
    this.establecimiento.set(null);
    if (await this.cargar(async () => this.establecimientos.set(await this.citas.establecimientos(especialidad.id)))) {
      this.paso.set(1);
    }
  }

  protected async elegirEstablecimiento(establecimiento: Establecimiento): Promise<void> {
    this.establecimiento.set(establecimiento);
    this.fecha.set('');
    this.cupo.set(null);
    const especialidadId = this.especialidad()!.id;
    if (await this.cargar(async () => this.fechas.set(await this.citas.fechas(especialidadId, establecimiento.id)))) {
      this.paso.set(2);
    }
  }

  protected async elegirFecha(fecha: string, limpiarError = true): Promise<void> {
    this.fecha.set(fecha);
    this.cupo.set(null);
    await this.cargar(
      async () => this.cupos.set(await this.citas.cupos(this.especialidad()!.id, this.establecimiento()!.id, fecha)),
      limpiarError,
    );
  }

  protected elegirCupo(cupo: Cupo): void {
    this.cupo.set(cupo);
    this.paso.set(3);
  }

  protected volver(paso: number): void {
    this.error.set('');
    this.paso.set(paso);
  }

  protected async confirmar(): Promise<void> {
    const cupo = this.cupo();
    if (!cupo) return;
    this.error.set('');
    this.enviando.set(true);
    try {
      const ficha = await this.citas.reservar(cupo.id);
      await this.router.navigate(['/citas', ficha.citaId], { state: { ficha, recienReservada: true } });
    } catch (e) {
      // Si alguien ganó el cupo, se vuelve a la hora para elegir otro (RN-01),
      // sin perder de vista el motivo del rechazo.
      this.error.set(mensajeDeError(e));
      this.paso.set(2);
      await this.elegirFecha(this.fecha(), false);
    } finally {
      this.enviando.set(false);
    }
  }
}
