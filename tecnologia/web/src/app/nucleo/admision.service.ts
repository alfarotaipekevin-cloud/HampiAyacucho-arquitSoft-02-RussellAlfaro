import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from './api';
import { AgendaDia, CitaAgenda, DiaAgenda, LecturaQr, ServiciosAdmision } from './modelos';

/** Llamadas de la recepción (spec 007, rol PERSONAL_SALUD). */
@Injectable({ providedIn: 'root' })
export class AdmisionService {
  private readonly http = inject(HttpClient);

  servicios() {
    return firstValueFrom(this.http.get<ServiciosAdmision>(`${API}/citas/admision/servicios`));
  }

  /** Sin fecha, la de hoy. Con fecha (RA-06), otro día de los próximos 7, solo para consultar. */
  agenda(especialidadId: string, fecha?: string) {
    return firstValueFrom(this.http.get<AgendaDia>(`${API}/citas/admision/agenda`, { params: fecha ? { especialidadId, fecha } : { especialidadId } }));
  }

  dias(especialidadId: string) {
    return firstValueFrom(this.http.get<DiaAgenda[]>(`${API}/citas/admision/dias`, { params: { especialidadId } }));
  }

  buscar(codigo: string) {
    return firstValueFrom(this.http.get<LecturaQr>(`${API}/citas/admision/codigo/${encodeURIComponent(codigo)}`));
  }

  registrarLlegada(citaId: string) {
    return firstValueFrom(this.http.post<CitaAgenda>(`${API}/citas/admision/${citaId}/llegada`, {}));
  }

  atender(citaId: string) {
    return firstValueFrom(this.http.post<CitaAgenda>(`${API}/citas/admision/${citaId}/atencion`, {}));
  }
}
