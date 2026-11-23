import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from './api';
import { Perfil, RespuestaPortal, Sesion } from './modelos';

/** Llamadas al módulo Identidad y al portal (specs 002 y 003). */
@Injectable({ providedIn: 'root' })
export class IdentidadService {
  private readonly http = inject(HttpClient);

  verificar(dni: string, fechaNacimiento: string) {
    return firstValueFrom(this.http.post<{ nombreCompleto: string }>(`${API}/identidad/registro/verificar`, { dni, fechaNacimiento }));
  }

  registrar(datos: {
    dni: string;
    fechaNacimiento: string;
    celular: string;
    correo?: string;
    contrasena: string;
    aceptaTratamientoDatos: boolean;
  }) {
    return firstValueFrom(this.http.post<{ id: string }>(`${API}/identidad/registro`, datos));
  }

  iniciarSesion(numeroDocumento: string, contrasena: string) {
    return firstValueFrom(this.http.post<Sesion>(`${API}/identidad/sesion`, { numeroDocumento, contrasena }));
  }

  perfil() {
    return firstValueFrom(this.http.get<Perfil>(`${API}/identidad/yo`));
  }

  solicitarCodigo(numeroDocumento: string) {
    return firstValueFrom(this.http.post<{ mensaje: string; celular?: string }>(`${API}/identidad/recuperacion`, { numeroDocumento }));
  }

  cambiarContrasena(numeroDocumento: string, codigo: string, nuevaContrasena: string) {
    return firstValueFrom(this.http.post<void>(`${API}/identidad/recuperacion/confirmar`, { numeroDocumento, codigo, nuevaContrasena }));
  }

  async modulos() {
    return (await firstValueFrom(this.http.get<RespuestaPortal>(`${API}/portal/modulos`))).modulos;
  }
}
