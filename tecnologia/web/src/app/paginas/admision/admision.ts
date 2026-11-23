import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BarraPortal } from '../../componentes/barra-portal';
import { LectorQr } from '../../componentes/lector-qr';
import { AdmisionService } from '../../nucleo/admision.service';
import { mensajeDeError } from '../../nucleo/api';
import { diaLargo, hora } from '../../nucleo/formato';
import { AgendaDia, CitaAgenda, EstadoAdmision, Especialidad, LecturaQr, ServiciosAdmision } from '../../nucleo/modelos';
import { TEXTOS } from '../../nucleo/textos';

type Filtro = 'TODAS' | EstadoAdmision;
const CLAVE_SERVICIO = 'hampi.admision.servicio';
const leerServicio = () => { try { return localStorage.getItem(CLAVE_SERVICIO); } catch { return null; } };
const guardarServicio = (id: string | null) => { try { id ? localStorage.setItem(CLAVE_SERVICIO, id) : localStorage.removeItem(CLAVE_SERVICIO); } catch { /* sin almacenamiento */ } };

/**
 * Spec 007 · Admisión con QR. La recepcionista elige el servicio de su piso, ve las citas de hoy,
 * lee el QR (cámara, lector USB o a mano), compara el DNI y registra la llegada; luego marca la atención.
 */
@Component({
  selector: 'app-admision',
  imports: [BarraPortal, FormsModule, LectorQr],
  templateUrl: './admision.html',
})
export class Admision implements OnDestroy {
  private readonly api = inject(AdmisionService);
  private readonly campoCodigo = viewChild<ElementRef<HTMLInputElement>>('campoCodigo');

  protected readonly t = TEXTOS.admision;
  protected readonly textos = TEXTOS;
  protected readonly hora = hora;
  protected readonly hoy = diaLargo(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()));

  protected readonly servicios = signal<ServiciosAdmision | null>(null);
  protected readonly servicio = signal<Especialidad | null>(null);
  protected readonly agenda = signal<AgendaDia | null>(null);
  protected readonly lectura = signal<LecturaQr | null>(null);
  protected readonly filtro = signal<Filtro>('TODAS');
  protected readonly camara = signal(false);
  protected readonly cargando = signal(true);
  protected readonly ocupado = signal('');
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected codigo = '';

  protected readonly visibles = computed(() => {
    const f = this.filtro();
    return (this.agenda()?.citas ?? []).filter((c) => f === 'TODAS' || c.estadoAdmision === f);
  });

  protected readonly filtros: { clave: Filtro; nombre: string }[] = [
    { clave: 'TODAS', nombre: TEXTOS.admision.filtroTodas },
    { clave: 'POR_LLEGAR', nombre: TEXTOS.admision.estados['POR_LLEGAR'] },
    { clave: 'EN_ESPERA', nombre: TEXTOS.admision.estados['EN_ESPERA'] },
    { clave: 'ATENDIDA', nombre: TEXTOS.admision.estados['ATENDIDA'] },
  ];

  private refresco?: ReturnType<typeof setInterval>;

  constructor() {
    this.iniciar();
    // La agenda se actualiza sola cada 30 s: otras recepcionistas o el médico pueden cambiarla.
    this.refresco = setInterval(() => this.servicio() && this.cargarAgenda(false), 30_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refresco);
  }

  private async iniciar(): Promise<void> {
    try {
      const s = await this.api.servicios();
      this.servicios.set(s);
      const guardado = s.especialidades.find((e) => e.id === leerServicio());
      if (guardado) await this.elegirServicio(guardado);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async elegirServicio(e: Especialidad): Promise<void> {
    this.servicio.set(e);
    guardarServicio(e.id);
    this.lectura.set(null);
    this.filtro.set('TODAS');
    await this.cargarAgenda();
    setTimeout(() => this.campoCodigo()?.nativeElement.focus());
  }

  protected cambiarServicio(): void {
    this.servicio.set(null);
    this.agenda.set(null);
    this.lectura.set(null);
    guardarServicio(null);
  }

  private async cargarAgenda(mostrarCarga = true): Promise<void> {
    const s = this.servicio();
    if (!s) return;
    if (mostrarCarga) this.cargando.set(true);
    try {
      this.agenda.set(await this.api.agenda(s.id));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  /** El lector USB "escribe" el código y pulsa Enter, así que llega por aquí igual que si se tipea. */
  protected async buscar(texto = this.codigo): Promise<void> {
    const codigo = texto.trim();
    if (!codigo) return;
    this.camara.set(false);
    this.error.set('');
    this.aviso.set('');
    this.ocupado.set('buscar');
    try {
      this.lectura.set(await this.api.buscar(codigo));
      this.codigo = '';
    } catch (e) {
      this.lectura.set(null);
      this.error.set(mensajeDeError(e));
    } finally {
      this.ocupado.set('');
    }
  }

  protected async registrarLlegada(citaId: string): Promise<void> {
    await this.accion(citaId, () => this.api.registrarLlegada(citaId), this.t.llegadaRegistrada);
  }

  protected async atender(citaId: string): Promise<void> {
    await this.accion(citaId, () => this.api.atender(citaId), this.t.atencionRegistrada);
  }

  private async accion(citaId: string, llamada: () => Promise<CitaAgenda>, mensaje: string): Promise<void> {
    this.error.set('');
    this.aviso.set('');
    this.ocupado.set(citaId);
    try {
      const cita = await llamada();
      this.aviso.set(`${mensaje} ${cita.paciente} · ${hora(cita.fechaHora)}`);
      const l = this.lectura();
      if (l?.citaId === citaId) this.lectura.set({ ...l, ...cita, puedeRegistrarLlegada: false, motivo: null });
      await this.cargarAgenda(false);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.ocupado.set('');
      this.campoCodigo()?.nativeElement.focus();
    }
  }

  protected cerrarLectura(): void {
    this.lectura.set(null);
    this.campoCodigo()?.nativeElement.focus();
  }
}
