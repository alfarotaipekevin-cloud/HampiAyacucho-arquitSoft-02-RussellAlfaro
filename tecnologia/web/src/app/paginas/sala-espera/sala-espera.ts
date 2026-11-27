import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdmisionService } from '../../nucleo/admision.service';
import { mensajeDeError } from '../../nucleo/api';
import { diaLargo, hora } from '../../nucleo/formato';
import { AgendaDia, CitaAgenda, Especialidad } from '../../nucleo/modelos';
import { TEXTOS } from '../../nucleo/textos';

/**
 * Pantalla de sala de espera para el televisor del piso (spec 007, extensión).
 * La abre la recepción desde Admisión con su sesión; se actualiza sola.
 * Por privacidad solo muestra el nombre y las iniciales de los apellidos, nunca el DNI.
 */
export function nombrePublico(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] ?? '';
  const apellidos = partes.length >= 3 ? partes.slice(-2) : partes.slice(1);
  return `${partes[0]} ${apellidos.map((a) => `${a[0]}.`).join(' ')}`;
}

const ahoraEnLima = () => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const hoyEnLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

@Component({
  selector: 'app-sala-espera',
  imports: [RouterLink],
  template: `
    <div class="tv">
      <header class="tv-cabecera">
        <div class="tv-marca">
          <img src="img/logo-hospital-horizontal.jpg" [alt]="textos.marca.hospital" width="182" height="62" />
          <span class="tv-separador" aria-hidden="true"></span>
          <div>
            <h1>{{ servicio()?.nombre ?? t.titulo }}</h1>
            <p>{{ t.titulo }}@if (establecimiento()) { · {{ establecimiento() }} }</p>
          </div>
        </div>
        <div class="tv-reloj" aria-live="off">
          <span class="tv-hora">{{ reloj() }}</span>
          <span class="tv-fecha">{{ fecha }}</span>
        </div>
      </header>

      @if (error()) {
        <main class="tv-cuerpo tv-vacio">
          <p class="aviso error" role="alert">{{ error() }}</p>
          <a routerLink="/admision" class="boton secundario">{{ t.volver }}</a>
        </main>
      } @else {
        <main class="tv-cuerpo">
          <section class="tv-turno" aria-live="polite" [attr.aria-label]="t.pasa">
            @if (turno(); as c) {
              <span class="tv-rotulo"><i aria-hidden="true"></i>{{ t.pasa }}</span>
              <p class="tv-nombre">{{ publico(c.paciente) }}</p>
              <p class="tv-cita">{{ t.citaDeLas }} {{ hora(c.fechaHora) }} · {{ t.codigo }} …{{ c.codigo.slice(-4) }}</p>
              <div class="tv-datos">
                <span><b>{{ t.consultorio }}</b>{{ c.consultorio.replace('Consultorio ', '') }}</span>
                <span><b>{{ t.medico }}</b>{{ c.medico }}</span>
              </div>
            } @else {
              <span class="tv-rotulo tv-rotulo-suave">{{ t.pasa }}</span>
              <p class="tv-nombre tv-nombre-suave">{{ t.nadieEsperando }}</p>
              <p class="tv-cita">{{ t.acercate }}</p>
            }
          </section>

          <div class="tv-lado">
            <section class="tv-bloque">
              <h2>{{ t.enEspera }}</h2>
              @for (c of enEspera(); track c.citaId) {
                <div class="tv-fila"><span class="tv-h">{{ hora(c.fechaHora) }}</span><span>{{ publico(c.paciente) }}</span><span class="tv-llego">✓ {{ t.llego }}</span></div>
              } @empty {
                <p class="tv-nada">{{ t.sinEspera }}</p>
              }
            </section>
            <section class="tv-bloque">
              <h2>{{ t.proximas }}</h2>
              @for (c of proximas(); track c.citaId) {
                <div class="tv-fila"><span class="tv-h">{{ hora(c.fechaHora) }}</span><span>{{ publico(c.paciente) }}</span><span class="tv-cons">{{ c.consultorio.replace('Consultorio', 'Cons.') }}</span></div>
              } @empty {
                <p class="tv-nada">{{ t.sinProximas }}</p>
              }
            </section>
          </div>
        </main>
      }

      <footer class="tv-pie"><b>{{ t.aviso }}</b><span>{{ t.avisoTexto }}</span></footer>
    </div>
  `,
})
export class SalaEspera implements OnDestroy {
  private readonly api = inject(AdmisionService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly t = TEXTOS.salaEspera;
  protected readonly textos = TEXTOS;
  protected readonly hora = hora;
  protected readonly publico = nombrePublico;
  protected readonly fecha = diaLargo(hoyEnLima());

  protected readonly servicio = signal<Especialidad | null>(null);
  protected readonly establecimiento = signal('');
  protected readonly agenda = signal<AgendaDia | null>(null);
  protected readonly reloj = signal(ahoraEnLima());
  protected readonly error = signal('');

  private readonly citas = computed(() => [...(this.agenda()?.citas ?? [])].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)));
  private readonly esperando = computed<CitaAgenda[]>(() => this.citas().filter((c) => c.estadoAdmision === 'EN_ESPERA'));
  /** Pasa a consulta el primero que ya llegó, en el orden de su cita. */
  protected readonly turno = computed(() => this.esperando()[0] ?? null);
  protected readonly enEspera = computed(() => this.esperando().slice(1, 5));
  protected readonly proximas = computed(() => this.citas().filter((c) => c.estadoAdmision === 'POR_LLEGAR').slice(0, 4));

  private readonly temporizadores: ReturnType<typeof setInterval>[] = [];

  constructor() {
    this.iniciar();
    this.temporizadores.push(setInterval(() => this.reloj.set(ahoraEnLima()), 10_000));
    // Se actualiza cada 15 s: refleja las llegadas y atenciones que registra la recepción.
    this.temporizadores.push(setInterval(() => this.servicio() && this.cargar(), 15_000));
  }

  ngOnDestroy(): void {
    this.temporizadores.forEach(clearInterval);
  }

  private async iniciar(): Promise<void> {
    try {
      const s = await this.api.servicios();
      this.establecimiento.set(s.establecimiento.nombre.split('"')[0].trim());
      const id = this.ruta.snapshot.queryParamMap.get('servicio');
      const elegido = s.especialidades.find((e) => e.id === id) ?? s.especialidades[0] ?? null;
      this.servicio.set(elegido);
      if (elegido) await this.cargar();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }

  private async cargar(): Promise<void> {
    try {
      this.agenda.set(await this.api.agenda(this.servicio()!.id));
      this.error.set('');
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }
}
