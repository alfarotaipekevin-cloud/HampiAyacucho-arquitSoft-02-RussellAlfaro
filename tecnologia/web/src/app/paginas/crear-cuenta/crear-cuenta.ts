import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MarcoAcceso } from '../../componentes/marco-acceso';
import { mensajeDeError } from '../../nucleo/api';
import { IdentidadService } from '../../nucleo/identidad.service';
import { TEXTOS } from '../../nucleo/textos';

/** HU09 · Crear cuenta en dos pasos: verificar el DNI en RENIEC y luego completar los datos (spec 002, §5.1). */
@Component({
  selector: 'app-crear-cuenta',
  imports: [FormsModule, RouterLink, MarcoAcceso],
  templateUrl: './crear-cuenta.html',
})
export class CrearCuenta {
  private readonly identidad = inject(IdentidadService);

  protected readonly textos = TEXTOS;
  protected readonly paso = signal<1 | 2 | 3>(1);
  protected readonly nombre = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly verContrasena = signal(false);

  protected dni = '';
  protected fechaNacimiento = '';
  protected celular = '';
  protected correo = '';
  protected contrasena = '';
  protected repetida = '';
  protected acepta = false;

  protected async verificar(): Promise<void> {
    this.error.set('');
    this.enviando.set(true);
    try {
      const { nombreCompleto } = await this.identidad.verificar(this.dni.trim(), this.fechaNacimiento);
      this.nombre.set(nombreCompleto);
      this.paso.set(2);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async crear(): Promise<void> {
    this.error.set('');
    if (this.contrasena !== this.repetida) {
      this.error.set(TEXTOS.crearCuenta.noCoinciden);
      return;
    }
    this.enviando.set(true);
    try {
      await this.identidad.registrar({
        dni: this.dni.trim(),
        fechaNacimiento: this.fechaNacimiento,
        celular: this.celular.trim(),
        correo: this.correo.trim() || undefined,
        contrasena: this.contrasena,
        aceptaTratamientoDatos: this.acepta,
      });
      this.paso.set(3);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected volverAlPaso1(): void {
    this.error.set('');
    this.paso.set(1);
  }
}
