/**
 * EQ-02 · Balanceador mínimo para la prueba de disponibilidad en local (sin Docker).
 * Hace lo mismo que nginx con proxy_next_upstream (ver nginx.conf): reparte las peticiones
 * en round robin y, si una instancia no responde, reintenta en la siguiente y la saca de la
 * rotación hasta que /salud vuelva a responder.
 *
 *   node balanceador.mjs 8080 http://localhost:3001 http://localhost:3002
 */
import http from 'node:http';

const [puerto, ...destinos] = process.argv.slice(2);
const instancias = destinos.map((url) => ({ url: new URL(url), sana: true, atendidas: 0, fallas: 0 }));
let turno = 0;

const sanas = () => instancias.filter((i) => i.sana);

function reenviar(req, res, cuerpo, intentos = 0) {
  const lista = sanas().length ? sanas() : instancias;
  const destino = lista[turno++ % lista.length];
  const peticion = http.request({
    hostname: destino.url.hostname, port: destino.url.port, path: req.url, method: req.method,
    headers: req.headers, timeout: 5000,
  }, (r) => {
    destino.atendidas++;
    res.writeHead(r.statusCode, { ...r.headers, 'x-instancia': destino.url.port });
    r.pipe(res);
  });
  const fallar = () => {
    destino.sana = false;
    destino.fallas++;
    if (intentos < instancias.length - 1) reenviar(req, res, cuerpo, intentos + 1);
    else if (!res.headersSent) { res.writeHead(502); res.end('{"error":{"codigo":"SIN_INSTANCIAS"}}'); }
  };
  peticion.on('error', fallar);
  peticion.on('timeout', () => peticion.destroy(new Error('timeout')));
  peticion.end(cuerpo);
}

http.createServer((req, res) => {
  if (req.url === '/balanceador/estado') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(instancias.map(({ url, sana, atendidas, fallas }) => ({ url: url.href, sana, atendidas, fallas }))));
    return;
  }
  const partes = [];
  req.on('data', (p) => partes.push(p));
  req.on('end', () => reenviar(req, res, Buffer.concat(partes)));
}).listen(Number(puerto), () => console.log(`Balanceador en :${puerto} → ${destinos.join(', ')}`));

// Revisión activa: cada segundo se consulta /salud de cada instancia.
setInterval(() => {
  for (const i of instancias) {
    http.get({ hostname: i.url.hostname, port: i.url.port, path: '/salud', timeout: 800 }, (r) => {
      i.sana = r.statusCode === 200;
      r.resume();
    }).on('error', () => { i.sana = false; }).on('timeout', function () { this.destroy(); });
  }
}, 1000);
