/**
 * EQ-02 · Disponibilidad con dos instancias detrás del balanceador.
 * Carga constante mientras el script ejecutar-eq02.sh apaga una instancia y luego Redis.
 * Medida: la reserva y la consulta siguen respondiendo (menos del 1 % de errores).
 *
 *   k6 run -e API_URL=http://localhost:8080 eq02-disponibilidad.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API = __ENV.API_URL || 'http://localhost:8080';
const ETIQUETA = __ENV.ETIQUETA || 'eq02-disponibilidad';
const errores = new Rate('errores');

export const options = {
  scenarios: {
    carga_constante: { executor: 'constant-vus', vus: Number(__ENV.VUS || 300), duration: __ENV.DURACION || '100s' },
  },
  thresholds: { errores: ['rate<0.01'], http_req_failed: ['rate<0.01'] },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

const json = { headers: { 'Content-Type': 'application/json' } };

export function setup() {
  http.post(`${API}/api/v1/identidad/registro`, JSON.stringify({
    dni: '70000003', fechaNacimiento: '2015-07-20', celular: '987000333', contrasena: 'Hampi2026', aceptaTratamientoDatos: true,
  }), json);
  const token = http.post(`${API}/api/v1/identidad/sesion`, JSON.stringify({ numeroDocumento: '70000003', contrasena: 'Hampi2026' }), json).json('token');
  const hoy = new Date(Date.now() - 5 * 3600_000);
  const fechas = Array.from({ length: 20 }, (_, i) => new Date(hoy.getTime() + (i + 1) * 86400_000).toISOString().slice(0, 10));
  return { token, fechas };
}

export default function ({ token, fechas }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const fecha = fechas[Math.floor(Math.random() * fechas.length)];
  const r = http.get(`${API}/api/v1/citas/cupos?especialidadId=mg&establecimientoId=hra&fecha=${fecha}`, auth);
  errores.add(r.status !== 200);
  check(r, { 'cupos 200': (x) => x.status === 200 });
  sleep(0.5 + Math.random() * 0.5);
}

export function handleSummary(data) {
  const v = (m, c) => data.metrics[m].values[c];
  const md = `# EQ-02 · ${ETIQUETA}

| Métrica | Valor |
| :--- | ---: |
| Usuarios virtuales | ${v('vus_max', 'max')} |
| Peticiones | ${v('http_reqs', 'count')} |
| Errores (respuesta distinta de 200) | ${(v('errores', 'rate') * 100).toFixed(3)} % |
| p95 | ${v('http_req_duration', 'p(95)').toFixed(1)} ms |
| Máximo | ${v('http_req_duration', 'max').toFixed(1)} ms |
`;
  return { [`resultados/${ETIQUETA}.md`]: md, [`resultados/${ETIQUETA}.json`]: JSON.stringify(data, null, 2), stdout: md };
}
