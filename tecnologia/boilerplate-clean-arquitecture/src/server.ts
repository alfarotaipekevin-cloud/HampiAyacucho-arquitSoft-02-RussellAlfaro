import { createServer } from 'node:http';
import { Cupo } from './modules/citas/dominio/cupo';
import { crearModuloCitas } from './modules/citas';

const cupos = [
  new Cupo('C-001', 'Medicina General', 'Hospital Regional de Ayacucho', new Date('2026-11-03T08:00:00-05:00')),
  new Cupo('C-002', 'Pediatría', 'C.S. San Juan Bautista', new Date('2026-11-03T09:00:00-05:00')),
];
const { controller } = crearModuloCitas(cupos, ['45678912', '70112233']);

createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/v1/citas') {
    let datos = '';
    req.on('data', (parte) => (datos += parte));
    req.on('end', async () => {
      const r = await controller.reservar(JSON.parse(datos || '{}'));
      res.writeHead(r.estado, { 'Content-Type': 'application/json' }).end(JSON.stringify(r.cuerpo));
    });
    return;
  }
  res.writeHead(404).end();
}).listen(3000, () => console.log('API Hampi (demo) en http://localhost:3000/api/v1/citas'));
