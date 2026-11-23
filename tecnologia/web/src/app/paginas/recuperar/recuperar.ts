import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MarcoAcceso } from '../../componentes/marco-acceso';
import { codigoDeError, mensajeDeError } from '../../nucleo/api';
import { IdentidadService } from '../../nucleo/identidad.service';
import { TEXTOS } from '../../nucleo/textos';

/** HU11 · Recuperar la contraseña con un código por SMS (spec 002, §5.4). */
@Component({
  selector: 'app-recuperar',
  imports: [FormsModule, RouterLink, MarcoAcceso],
  templateUrl: './recuperar.html',
})
export class Recuperar {
  private readonly identidad = inject(IdentidadService);

  protected readonly textos = TEXTOS;
  protected readonly paso = signal<1 | 2 | 3>(1);
  protected readonly celular = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly verContrasena = signal(false);

  protected documento = '';
  protected codigo = '';
  protected nueva = '';
  protected repetida = '';

  protected async solicitar(): Promise<void> {
    this.error.set('');
    this.enviando.set(true);
    try {
      const r = await this.identidad.solicitarCodigo(this.documento.trim());
      this.celular.set(r.celular ?? '');
      this.paso.set(2);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async cambiar(): Promise<void> {
    this.error.set('');
    if (this.nueva !== this.repetida) {
      this.error.set(TEXTOS.crearCuenta.noCoinciden);
      return;
    }
    this.enviando.set(true);
    try {
      await this.identidad.cambiarContrasena(this.documento.trim(), this.codigo.trim(), this.nueva);
      this.paso.set(3);
    } catch (e) {
      this.error.set(mensajeDeError(e));
      // Si el código venció o se agotaron los intentos hay que pedir uno nuevo.
      const codigo = codigoDeError(e);
      if (codigo === 'CODIGO_VENCIDO' || codigo === 'INTENTOS_AGOTADOS') this.codigo = '';
    } finally {
      this.enviando.set(false);
    }
  }

  protected pedirOtro(): void {
    this.codigo = '';
    this.error.set('');
    this.paso.set(1);
  }
}
