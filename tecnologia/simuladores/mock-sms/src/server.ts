import { crearApp } from './app';

const puerto = Number(process.env.PORT ?? 4002);

crearApp({
  apiKey: process.env.SMS_API_KEY ?? 'clave-sms-local',
  falla: process.env.MOCK_FALLA === 'true',
}).listen(puerto, () => console.log(`Simulador SMS en http://localhost:${puerto} · bandeja en /mensajes`));
