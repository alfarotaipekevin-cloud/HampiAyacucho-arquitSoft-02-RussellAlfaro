import express, { RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { crearModuloCitas, ExportadorFicha, Notificador, ValidadorIdentidad, GeneradorQR } from './modules/citas';
import { crearModuloIdentidad } from './modules/identidad';
import { crearModuloPortal } from './modules/portal';
import { Cache } from './shared/dominio/cache';
import { Reloj } from './shared/dominio/reloj';
import { manejadorErrores } from './shared/http/manejador-errores';
import { documentoOpenApi } from './shared/http/openapi';
import type { DependenciasIdentidad } from './modules/identidad';
import type { DependenciasCitas } from './modules/citas';

/** Implementaciones concretas de todos los puertos; las arma infraestructura.ts (memoria o PostgreSQL). */
export interface Infraestructura {
  usuarios: DependenciasIdentidad['usuarios'];
  codigos: DependenciasIdentidad['codigos'];
  mensajeroIdentidad: DependenciasIdentidad['mensajero'];
  registroCivil: DependenciasIdentidad['registroCivil'];
  hasheador: DependenciasIdentidad['hasheador'];
  emisor: DependenciasIdentidad['emisor'];
  catalogo: DependenciasCitas['catalogo'];
  cupos: DependenciasCitas['cupos'];
  citas: DependenciasCitas['citas'];
  personal: DependenciasCitas['personal'];
  validadorIdentidad: ValidadorIdentidad;
  notificador: Notificador;
  qr: GeneradorQR;
  exportadorFicha: ExportadorFicha;
  reloj: Reloj;
  cache?: Cache;
}

/** CORS: solo los orígenes configurados pueden llamar a la API desde el navegador. */
const cors = (origenes: string[]): RequestHandler => (req, res, next) => {
  const origen = req.headers.origin;
  if (origen && origenes.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
};

/** Raíz de composición de la aplicación: conecta los módulos del monolito modular. */
export function crearApp(infra: Infraestructura, opciones: { origenesCors?: string[] } = {}) {
  const identidad = crearModuloIdentidad({
    usuarios: infra.usuarios,
    codigos: infra.codigos,
    mensajero: infra.mensajeroIdentidad,
    registroCivil: infra.registroCivil,
    hasheador: infra.hasheador,
    emisor: infra.emisor,
    reloj: infra.reloj,
  });

  const citas = crearModuloCitas({
    catalogo: infra.catalogo,
    cupos: infra.cupos,
    citas: infra.citas,
    personal: infra.personal,
    identidad: infra.validadorIdentidad,
    notificador: infra.notificador,
    qr: infra.qr,
    exportador: infra.exportadorFicha,
    reloj: infra.reloj,
    // Citas pide los datos del paciente a la API pública de Identidad (P3).
    pacientes: {
      obtener: async (id) => {
        const perfil = await identidad.consultarPerfil(id);
        return { nombreCompleto: perfil.nombreCompleto, celular: perfil.celular };
      },
    },
    autenticar: identidad.autenticarJwt,
    autorizarRol: identidad.autorizarRol,
  });

  const portal = crearModuloPortal(citas.tarjetas, identidad.autenticarJwt);

  const app = express();
  app.disable('x-powered-by');
  app.use(cors(opciones.origenesCors ?? []));
  app.use(express.json({ limit: '50kb' }));

  app.get('/salud', (_req, res) => {
    res.json({ estado: 'ok', servicio: 'hampi-api', cache: infra.cache?.estadisticas() });
  });
  // Documentación OpenAPI/Swagger (Sprint 2, actividad 4)
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.json(documentoOpenApi);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(documentoOpenApi, { customSiteTitle: 'Hampi Ayacucho · API' }));

  app.use('/api/v1/identidad', identidad.rutas);
  app.use('/api/v1/portal', portal.rutas);
  app.use('/api/v1/citas', citas.rutas);

  app.use((_req, res) => {
    res.status(404).json({ error: { codigo: 'RUTA_NO_EXISTE', mensaje: 'La ruta solicitada no existe' } });
  });
  app.use(manejadorErrores);
  return app;
}
