import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MarcoAcceso } from '../../componentes/marco-acceso';
import { mensajeDeError } from '../../nucleo/api';
import { IdentidadService } from '../../nucleo/identidad.service';
import { SesionService } from '../../nucleo/sesion.service';
import { TEXTOS } from '../../nucleo/textos';

/** HU10 · Ingreso con número de documento y contraseña (spec 002, §5.2). */
@Component({
  selector: 'app-ingresar',
  imports: [FormsModule, RouterLink, MarcoAcceso],
  templateUrl: './ingresar.html',
})
export class Ingresar {
  private readonly identidad = inject(IdentidadService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected readonly textos = TEXTOS;
  protected documento = this.sesion.documentoRecordado;
  protected contrasena = '';
  protected recordar = this.sesion.documentoRecordado.length > 0;
  protected readonly verContrasena = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  /** Llega como ?expirada=1 cuando el interceptor corta una sesión vencida. */
  protected readonly expirada = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('expirada') === '1');

  protected async ingresar(): Promise<void> {
    this.error.set('');
    this.expirada.set(false);
    this.enviando.set(true);
    try {
      const sesion = await this.identidad.iniciarSesion(this.documento.trim(), this.contrasena);
      this.sesion.guardar(sesion);
      this.sesion.recordarDocumento(this.documento.trim(), this.recordar);
      await this.router.navigate(['/portal']);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
