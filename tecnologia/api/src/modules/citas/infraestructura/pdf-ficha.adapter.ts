import PDFDocument from 'pdfkit';
import { ExportadorFicha, FichaCita } from '../aplicacion/ficha-cita';

const VERDE = '#0b6e4f';

/** '2026-11-05T08:00:00-05:00' → '05/11/2026 08:00 (hora de Lima)' */
const fechaLegible = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)} (hora de Lima)`;

/** Ficha de la cita en PDF (A5) con el QR, para imprimirla o mostrarla en el celular. */
export class PdfFichaAdapter implements ExportadorFicha {
  pdf(ficha: FichaCita): Promise<Buffer> {
    return new Promise((listo, fallo) => {
      const doc = new PDFDocument({ size: 'A5', margin: 36, info: { Title: `Ficha ${ficha.codigo}`, Author: 'Hampi Ayacucho' } });
      const partes: Buffer[] = [];
      doc.on('data', (p: Buffer) => partes.push(p));
      doc.on('end', () => listo(Buffer.concat(partes)));
      doc.on('error', fallo);

      const ancho = doc.page.width - 72;
      doc.rect(0, 0, doc.page.width, 64).fill(VERDE);
      doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('Hampi Ayacucho', 36, 18);
      doc.fontSize(10).font('Helvetica').text('Ficha de cita médica', 36, 40);

      doc.fillColor('black').moveDown(3);
      doc.font('Helvetica-Bold').fontSize(16).text(ficha.codigo, 36, 84, { width: ancho, align: 'center' });
      const qr = Buffer.from(ficha.qr.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(qr, (doc.page.width - 150) / 2, 110, { width: 150 });

      let y = 275;
      const fila = (etiqueta: string, valor: string) => {
        doc.font('Helvetica').fontSize(9).fillColor('#555').text(etiqueta.toUpperCase(), 36, y);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('black').text(valor, 36, y + 11, { width: ancho });
        y += 32;
      };
      fila('Paciente', ficha.paciente);
      fila('Especialidad', ficha.especialidad);
      fila('Establecimiento', ficha.establecimiento);
      fila('Fecha y hora', fechaLegible(ficha.fechaHora));
      fila('Consultorio y médico', `${ficha.consultorio} · ${ficha.medico}`);
      fila('Estado', ficha.estado);

      doc.font('Helvetica').fontSize(9).fillColor('#555')
        .text('Llega 20 minutos antes con tu DNI. Muestra este código QR en admisión.', 36, y + 6, { width: ancho, align: 'center' });
      doc.end();
    });
  }
}
