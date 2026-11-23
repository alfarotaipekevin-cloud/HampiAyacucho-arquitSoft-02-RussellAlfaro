import express, { Response } from 'express';
import personas from './datos/personas.json';

// Simulador de la consulta de DNI de RENIEC en la PIDE (spec 001, sección 3).
// Todos los datos son ficticios (MP-01).

export interface ConfiguracionPide {
  usuario: string;   // nuDniUsuario de la entidad consultante (MP-03)
  password: string;
  latenciaMs: number; // MP-05
  falla: boolean;     // MP-04: simula el servicio caído
}

export const DNI_QUE_FALLA = '79999999';

type Persona = (typeof personas)[number];

const responder = (res: Response, http: number, coResultado: string, deResultado: string, datosPersona: Persona | null = null) =>
  res.status(http).json({ coResultado, deResultado, datosPersona });

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function crearApp(config: ConfiguracionPide) {
  const app = express();
  app.use(express.json());

  app.get('/salud', (_req, res) => {
    res.json({ estado: 'ok', servicio: 'mock-pide-reniec' });
  });

  app.post('/reniec/consulta-dni', async (req, res) => {
    await esperar(config.latenciaMs);
    const { nuDniConsulta, nuDniUsuario, password } = req.body ?? {};

    if (config.falla) {
      return responder(res, 503, '9999', 'Servicio no disponible (falla simulada)');
    }
    if (nuDniUsuario !== config.usuario || password !== config.password) {
      return responder(res, 401, '1000', 'Credenciales de la entidad inválidas');
    }
    if (typeof nuDniConsulta !== 'string' || !/^\d{8}$/.test(nuDniConsulta)) {
      return responder(res, 400, '1001', 'El DNI debe tener 8 dígitos');
    }
    if (nuDniConsulta === DNI_QUE_FALLA) {
      return responder(res, 503, '9999', 'Servicio no disponible (falla simulada)');
    }

    const persona = personas.find((p) => p.nuDni === nuDniConsulta);
    if (!persona) {
      return responder(res, 200, '0001', 'El DNI consultado no existe');
    }
    if (persona.restriccion) {
      return responder(res, 200, '0002', `DNI con restricción: ${persona.restriccion}`, persona);
    }
    return responder(res, 200, '0000', 'Consulta realizada correctamente', persona);
  });

  return app;
}
