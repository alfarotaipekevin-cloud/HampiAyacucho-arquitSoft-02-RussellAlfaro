import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarraPortal } from '../../componentes/barra-portal';
import { mensajeDeError } from '../../nucleo/api';
import { CitasService } from '../../nucleo/citas.service';
import { diaLargo, esFutura, hora } from '../../nucleo/formato';
import { IdentidadService } from '../../nucleo/identidad.service';
import { AgendaDia, CitaResumen, Especialidad, TarjetaModulo } from '../../nucleo/modelos';
import { AdmisionService } from '../../nucleo/admision.service';
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
  private readonly admision = inject(AdmisionService);

  protected readonly textos = TEXTOS;
  protected readonly t = TEXTOS.portal;
  protected readonly usuario = inject(SesionService).usuario;
  protected readonly modulos = signal<TarjetaModulo[]>([]);
  protected readonly misCitas = signal<CitaResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly esPaciente = computed(() => this.usuario()?.rol === 'PACIENTE');
  protected readonly esPersonal = computed(() => this.usuario()?.rol === 'PERSONAL_SALUD');

  /** Personal de salud: resumen de hoy de cada servicio de su establecimiento (spec 007). */
  protected readonly establecimiento = signal('');
  protected readonly hoyPorServicio = signal<{ servicio: Especialidad; agenda: AgendaDia }[]>([]);
  protected readonly proximasLlegadas = computed(() =>
    this.hoyPorServicio()
      .flatMap(({ servicio, agenda }) => agenda.citas.filter((c) => c.estadoAdmision === 'POR_LLEGAR').map((c) => ({ ...c, servicio })))
      .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
      .slice(0, 3),
  );
  protected readonly totalesHoy = computed(() => {
    const t = { citas: 0, porLlegar: 0, enEspera: 0, atendidas: 0 };
    for (const { agenda } of this.hoyPorServicio()) {
      t.citas += agenda.citas.filter((c) => c.estadoAdmision !== 'CANCELADA').length;
      t.porLlegar += agenda.resumen.porLlegar;
      t.enEspera += agenda.resumen.enEspera;
      t.atendidas += agenda.resumen.atendidas;
    }
    return t;
  });
  protected readonly avance = (a: AgendaDia) => {
    const total = a.citas.filter((c) => c.estadoAdmision !== 'CANCELADA').length;
    return total ? Math.round((a.resumen.atendidas / total) * 100) : 0;
  };
  protected readonly activas = (a: AgendaDia) => a.citas.filter((c) => c.estadoAdmision !== 'CANCELADA').length;
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

  private async cargarHoy(): Promise<void> {
    try {
      const s = await this.admision.servicios();
      this.establecimiento.set(s.establecimiento.nombre);
      const filas = await Promise.all(s.especialidades.map(async (servicio) => ({ servicio, agenda: await this.admision.agenda(servicio.id) })));
      // Primero los servicios con citas hoy; los vacíos quedan al final.
      this.hoyPorServicio.set(filas.sort((a, b) => Number(!this.activas(a.agenda)) - Number(!this.activas(b.agenda))));
    } catch {
      // Sin establecimiento asignado: el portal muestra solo las tarjetas.
    }
  }

  private async cargar(): Promise<void> {
    try {
      const [modulos, citas] = await Promise.all([
        this.identidad.modulos(),
        this.esPaciente() ? this.citas.mias().catch(() => [] as CitaResumen[]) : Promise.resolve([] as CitaResumen[]),
      ]);
      this.modulos.set(modulos);
      this.misCitas.set(citas);
      if (this.esPersonal()) await this.cargarHoy();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
