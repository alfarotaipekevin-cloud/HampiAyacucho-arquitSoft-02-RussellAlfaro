import { Component, ElementRef, OnDestroy, output, signal, viewChild } from '@angular/core';

/**
 * Spec 007 · Lector de QR con la cámara del celular, tablet o webcam (sin equipos especiales).
 * Usa getUserMedia y jsQR (se carga solo al abrir la cámara). Emite el texto del QR una sola vez.
 */
@Component({
  selector: 'app-lector-qr',
  template: `
    <div class="lector-camara">
      <video #video playsinline muted aria-label="Vista de la cámara"></video>
      <span class="marco-qr" aria-hidden="true"></span>
      <p class="ayuda-camara" role="status">{{ estado() }}</p>
      <button type="button" class="secundario" (click)="cerrar.emit()">Cerrar la cámara</button>
    </div>
  `,
})
export class LectorQr implements OnDestroy {
  readonly leido = output<string>();
  readonly cerrar = output<void>();
  protected readonly estado = signal('Abriendo la cámara...');

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private flujo: MediaStream | null = null;
  private activo = true;

  constructor() {
    queueMicrotask(() => this.iniciar());
  }

  private async iniciar(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.estado.set('Este navegador no permite usar la cámara. Escribe el código o usa el lector USB.');
      return;
    }
    try {
      const [{ default: jsQR }, flujo] = await Promise.all([
        import('jsqr'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
      ]);
      if (!this.activo) return flujo.getTracks().forEach((p) => p.stop());
      this.flujo = flujo;
      const video = this.video().nativeElement;
      video.srcObject = flujo;
      await video.play();
      this.estado.set('Apunta la cámara al código QR de la ficha.');

      const lienzo = document.createElement('canvas');
      const contexto = lienzo.getContext('2d', { willReadFrequently: true })!;
      const buscar = () => {
        if (!this.activo) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          lienzo.width = video.videoWidth;
          lienzo.height = video.videoHeight;
          contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
          const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
          const qr = jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: 'dontInvert' });
          if (qr?.data) {
            this.detener();
            this.leido.emit(qr.data);
            return;
          }
        }
        requestAnimationFrame(buscar);
      };
      requestAnimationFrame(buscar);
    } catch {
      this.estado.set('No se pudo abrir la cámara (permiso denegado o sin cámara). Escribe el código o usa el lector USB.');
    }
  }

  private detener(): void {
    this.activo = false;
    this.flujo?.getTracks().forEach((p) => p.stop());
    this.flujo = null;
  }

  ngOnDestroy(): void {
    this.detener();
  }
}
