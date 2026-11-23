import { crearApp } from './app';

const puerto = Number(process.env.PORT ?? 4001);

crearApp({
  usuario: process.env.PIDE_USUARIO ?? '40000000',
  password: process.env.PIDE_PASSWORD ?? 'clave-entidad',
  latenciaMs: Number(process.env.MOCK_LATENCIA_MS ?? 200),
  falla: process.env.MOCK_FALLA === 'true',
}).listen(puerto, () => console.log(`Simulador PIDE/RENIEC en http://localhost:${puerto}/reniec/consulta-dni`));
