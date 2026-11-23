import { RequestHandler, Router } from 'express';
import { usuarioDe } from '../../../shared/http/peticion';
import { CancelarCitaUseCase } from '../aplicacion/cancelar-cita.use-case';
import { ConsultarDisponibilidadUseCase } from '../aplicacion/consultar-disponibilidad.use-case';
import { ConsultarMisCitasUseCase } from '../aplicacion/consultar-mis-citas.use-case';
import { ExportadorFicha } from '../aplicacion/ficha-cita';
import { ReservarCitaUseCase } from '../aplicacion/reservar-cita.use-case';

interface CasosDeUso {
  disponibilidad: ConsultarDisponibilidadUseCase;
  reservarCita: ReservarCitaUseCase;
  misCitas: ConsultarMisCitasUseCase;
  cancelarCita: CancelarCitaUseCase;
  exportador: ExportadorFicha;
}

interface Seguridad {
  autenticar: RequestHandler;
  soloPacientes: RequestHandler;
  verCatalogo: RequestHandler;
}

/** Rutas /api/v1/citas (specs 004 y 005). */
export function crearRutasCitas(casos: CasosDeUso, s: Seguridad): Router {
  const rutas = Router();
  rutas.use(s.autenticar);

  // Spec 004 · disponibilidad
  rutas.get('/especialidades', s.verCatalogo, async (_req, res) => {
    res.json(await casos.disponibilidad.especialidades());
  });
  rutas.get('/establecimientos', s.verCatalogo, async (req, res) => {
    res.json(await casos.disponibilidad.establecimientos(req.query.especialidadId));
  });
  rutas.get('/cupos', s.verCatalogo, async (req, res) => {
    const { especialidadId, establecimientoId, fecha } = req.query;
    res.json(await casos.disponibilidad.cuposDelDia({ especialidadId, establecimientoId, fecha }));
  });
  rutas.get('/cupos/fechas', s.verCatalogo, async (req, res) => {
    const { especialidadId, establecimientoId } = req.query;
    res.json(await casos.disponibilidad.fechas({ especialidadId, establecimientoId }));
  });

  // Spec 005 · reserva y mis citas
  rutas.post('/', s.soloPacientes, async (req, res) => {
    const usuario = usuarioDe(req);
    const ficha = await casos.reservarCita.ejecutar({ pacienteId: usuario.id, dni: usuario.dni, cupoId: req.body?.cupoId });
    res.status(201).json(ficha);
  });
  rutas.get('/mias', s.soloPacientes, async (req, res) => {
    res.json(await casos.misCitas.listar(usuarioDe(req).id, req.query.estado));
  });
  rutas.get('/:citaId/ficha.pdf', s.soloPacientes, async (req, res) => {
    const ficha = await casos.misCitas.obtener(usuarioDe(req).id, String(req.params.citaId));
    res.type('application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="ficha-${ficha.codigo}.pdf"`)
      .send(await casos.exportador.pdf(ficha));
  });
  rutas.patch('/:citaId/cancelar', s.soloPacientes, async (req, res) => {
    res.json(await casos.cancelarCita.ejecutar(usuarioDe(req).id, String(req.params.citaId)));
  });
  rutas.get('/:citaId', s.soloPacientes, async (req, res) => {
    res.json(await casos.misCitas.obtener(usuarioDe(req).id, String(req.params.citaId)));
  });

  return rutas;
}
