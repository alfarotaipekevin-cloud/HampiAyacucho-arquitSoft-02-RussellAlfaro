import express from 'express';
import { randomUUID } from 'node:crypto';

// Simulador del proveedor de SMS (spec 001, sección 4).
// Los mensajes se guardan en memoria y se pierden al reiniciar (MS-05).

export interface ConfiguracionSms {
  apiKey: string;  // MS-03
  falla: boolean;  // MS-04: simula el proveedor caído
}

export const TELEFONO_QUE_FALLA = '+51900000000';
const FORMATO_TELEFONO = /^\+519\d{8}$/;  // MS-01
const MAX_CARACTERES = 160;               // MS-02

interface Mensaje {
  id: string;
  telefono: string;
  texto: string;
  estado: 'ENCOLADO';
  recibidoEn: string;
}

const error = (codigo: string, mensaje: string) => ({ error: { codigo, mensaje } });

const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function crearApp(config: ConfiguracionSms) {
  const app = express();
  const mensajes: Mensaje[] = [];
  app.use(express.json());

  app.get('/salud', (_req, res) => {
    res.json({ estado: 'ok', servicio: 'mock-sms' });
  });

  app.post('/v1/mensajes', (req, res) => {
    if (config.falla) {
      return res.status(503).json(error('PROVEEDOR_NO_DISPONIBLE', 'Proveedor de SMS caído (falla simulada)'));
    }
    if (req.headers.authorization !== `Bearer ${config.apiKey}`) {
      return res.status(401).json(error('NO_AUTORIZADO', 'API key inválida'));
    }
    const { telefono, texto } = req.body ?? {};
    if (typeof telefono !== 'string' || !FORMATO_TELEFONO.test(telefono)) {
      return res.status(400).json(error('TELEFONO_INVALIDO', 'El teléfono debe tener el formato +519XXXXXXXX'));
    }
    if (typeof texto !== 'string' || texto.length === 0 || texto.length > MAX_CARACTERES) {
      return res.status(400).json(error('TEXTO_INVALIDO', `El texto debe tener entre 1 y ${MAX_CARACTERES} caracteres`));
    }
    if (telefono === TELEFONO_QUE_FALLA) {
      return res.status(503).json(error('PROVEEDOR_NO_DISPONIBLE', 'Proveedor de SMS caído (falla simulada)'));
    }

    const mensaje: Mensaje = {
      id: `sms_${randomUUID()}`,
      telefono,
      texto,
      estado: 'ENCOLADO',
      recibidoEn: new Date().toISOString(),
    };
    mensajes.push(mensaje);
    return res.status(202).json({ id: mensaje.id, estado: mensaje.estado, recibidoEn: mensaje.recibidoEn });
  });

  app.get('/v1/mensajes', (req, res) => {
    const { telefono } = req.query;
    res.json(telefono ? mensajes.filter((m) => m.telefono === telefono) : mensajes);
  });

  app.delete('/v1/mensajes', (_req, res) => {
    mensajes.length = 0;
    res.status(204).end();
  });

  // Bandeja para la demo: muestra los SMS como en un celular y se actualiza cada 5 s.
  app.get('/mensajes', (_req, res) => {
    const tarjetas = [...mensajes]
      .reverse()
      .map(
        (m) => `<li><div class="cabecera"><strong>${escaparHtml(m.telefono)}</strong>
          <time>${new Date(m.recibidoEn).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</time></div>
          <p>${escaparHtml(m.texto)}</p></li>`,
      )
      .join('');
    res.type('html').send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="5">
  <title>Bandeja SMS · Hampi</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #e6f6fb; color: #12324a; }
    main { max-width: 420px; margin: 24px auto; padding: 0 16px; }
    h1 { font-size: 1.2rem; }
    ul { list-style: none; padding: 0; }
    li { background: #fff; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 3px #0002; }
    .cabecera { display: flex; justify-content: space-between; font-size: .85rem; color: #4a6577; }
    p { margin: 6px 0 0; }
    .vacio { color: #4a6577; }
  </style>
</head>
<body>
  <main>
    <h1>Bandeja SMS simulada (${mensajes.length})</h1>
    ${tarjetas ? `<ul>${tarjetas}</ul>` : '<p class="vacio">Aún no se ha enviado ningún SMS.</p>'}
  </main>
</body>
</html>`);
  });

  return app;
}
