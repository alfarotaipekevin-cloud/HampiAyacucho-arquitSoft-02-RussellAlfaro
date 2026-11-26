import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from './api';
import { CitaResumen, Cupo, Especialidad, Establecimiento, Ficha } from './modelos';

/** Llamadas al módulo Citas (specs 004 y 005). */
@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly http = inject(HttpClient);

  especialidades() {
    return firstValueFrom(this.http.get<Especialidad[]>(`${API}/citas/especialidades`));
  }

  establecimientos(especialidadId: string) {
    return firstValueFrom(this.http.get<Establecimiento[]>(`${API}/citas/establecimientos`, { params: { especialidadId } }));
  }

  fechas(especialidadId: string, establecimientoId: string) {
    return firstValueFrom(this.http.get<string[]>(`${API}/citas/cupos/fechas`, { params: { especialidadId, establecimientoId } }));
  }

  cupos(especialidadId: string, establecimientoId: string, fecha: string) {
    return firstValueFrom(this.http.get<Cupo[]>(`${API}/citas/cupos`, { params: { especialidadId, establecimientoId, fecha } }));
  }

  reservar(cupoId: string) {
    return firstValueFrom(this.http.post<Ficha>(`${API}/citas`, { cupoId }));
  }

  mias(estado?: string) {
    return firstValueFrom(this.http.get<CitaResumen[]>(`${API}/citas/mias`, estado ? { params: { estado } } : {}));
  }

  ficha(citaId: string) {
    return firstValueFrom(this.http.get<Ficha>(`${API}/citas/${citaId}`));
  }

  cancelar(citaId: string) {
    return firstValueFrom(this.http.patch<{ estado: string }>(`${API}/citas/${citaId}/cancelar`, {}));
  }

  /** Spec 008: cambia la cita a otro cupo del mismo servicio; el código QR no cambia. */
  reprogramar(citaId: string, cupoId: string) {
    return firstValueFrom(this.http.patch<Ficha>(`${API}/citas/${citaId}/reprogramar`, { cupoId }));
  }

  /** El PDF se pide con el token, así que se descarga como blob y no con un enlace directo. */
  fichaPdf(citaId: string) {
    return firstValueFrom(this.http.get(`${API}/citas/${citaId}/ficha.pdf`, { responseType: 'blob' }));
  }
}
