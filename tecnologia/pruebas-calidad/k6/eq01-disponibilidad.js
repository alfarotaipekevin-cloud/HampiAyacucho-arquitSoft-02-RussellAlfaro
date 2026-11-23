/**
 * EQ-01 · Rendimiento de la consulta de disponibilidad (Sprint 2, actividad 8).
 * Sube progresivamente hasta 2,000 usuarios virtuales concurrentes, como pide la guía.
 *
 *   k6 run -e API_URL=http://localhost:3000 -e ETIQUETA=con-redis eq01-disponibilidad.js
 *
 * Variables: API_URL, ETIQUETA (nombre del archivo de resultados), VU_MAX (por defecto 2000),
 * ESCALA (multiplica las duraciones; 0.5 = prueba corta).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const API = __ENV.API_URL || 'http://localhost:3000';
const ETIQUETA = __ENV.ETIQUETA || 'resultado';
const VU_MAX = Number(__ENV.VU_MAX || 2000);
const ESCALA = Number(__ENV.ESCALA || 1);
const d = (seg) => `${Math.round(seg * ESCALA)}s`;

const tiempoCupos = new Trend('tiempo_cupos', true);
const tiempoFechas = new Trend('tiempo_fechas', true);
const erroresServidor = new Rate('errores_5xx');
const consultas = new Counter('consultas_disponibilidad');

export const options = {
  scenarios: {
    apertura_de_cupos: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: d(30), target: Math.round(VU_MAX * 0.1) },  //   200
        { duration: d(30), target: Math.round(VU_MAX * 0.25) }, //   500
        { duration: d(30), target: Math.round(VU_MAX * 0.5) },  // 1,000
        { duration: d(30), target: VU_MAX },                    // 2,000
        { duration: d(60), target: VU_MAX },                    // meseta con 2,000 concurrentes
        { duration: d(20), target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  // Medidas de EQ-01 (docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md)
  thresholds: {
    'http_req_duration{tipo:cupos}': ['p(95)<2000'],
    errores_5xx: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const json = { headers: { 'Content-Type': 'application/json' } };

/** Crea (si hace falta) la cuenta de una paciente ficticia del simulador RENIEC y entra. */
export function setup() {
  http.post(`${API}/api/v1/identidad/registro`, JSON.stringify({
    dni: '70000003', fechaNacimiento: '2015-07-20', celular: '987000333', contrasena: 'Hampi2026', aceptaTratamientoDatos: true,
  }), json);
  const sesion = http.post(`${API}/api/v1/identidad/sesion`, JSON.stringify({ numeroDocumento: '70000003', contrasena: 'Hampi2026' }), json);
  if (sesion.status !== 200) throw new Error(`No se pudo iniciar sesión: ${sesion.status} ${sesion.body}`);
  const token = sesion.json('token');
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // Combinaciones especialidad-establecimiento reales (RN-08)
  const ofertas = [];
  for (const esp of http.get(`${API}/api/v1/citas/especialidades`, auth).json()) {
    for (const est of http.get(`${API}/api/v1/citas/establecimientos?especialidadId=${esp.id}`, auth).json()) {
      ofertas.push({ esp: esp.id, est: est.id });
    }
  }
  const hoy = new Date(Date.now() - 5 * 3600_000);
  const fechas = Array.from({ length: 30 }, (_, i) => new Date(hoy.getTime() + i * 86400_000).toISOString().slice(0, 10));
  return { token, ofertas, fechas, cacheAntes: http.get(`${API}/salud`).json('cache') };
}

export default function (datos) {
  const auth = { headers: { Authorization: `Bearer ${datos.token}` } };
  const o = datos.ofertas[Math.floor(Math.random() * datos.ofertas.length)];

  // 1) El paciente abre el calendario de la especialidad
  const rf = http.get(`${API}/api/v1/citas/cupos/fechas?especialidadId=${o.esp}&establecimientoId=${o.est}`, { ...auth, tags: { tipo: 'fechas' } });
  tiempoFechas.add(rf.timings.duration);
  erroresServidor.add(rf.status >= 500);

  // 2) Elige un día y consulta los cupos libres
  const fecha = datos.fechas[Math.floor(Math.random() * datos.fechas.length)];
  const rc = http.get(`${API}/api/v1/citas/cupos?especialidadId=${o.esp}&establecimientoId=${o.est}&fecha=${fecha}`, { ...auth, tags: { tipo: 'cupos' } });
  tiempoCupos.add(rc.timings.duration);
  erroresServidor.add(rc.status >= 500);
  consultas.add(2);

  check(rc, {
    'cupos responde 200': (r) => r.status === 200,
    'solo cupos libres con hora': (r) => r.status === 200 && r.json().every((c) => c.id && c.fechaHora),
  });
  check(rf, { 'fechas responde 200': (r) => r.status === 200 });

  sleep(1 + Math.random()); // tiempo que el paciente mira la pantalla
}

export function teardown(datos) {
  const cache = http.get(`${API}/salud`).json('cache');
  console.log(`Caché antes: ${JSON.stringify(datos.cacheAntes)} · después: ${JSON.stringify(cache)}`);
}

export function handleSummary(data) {
  const m = data.metrics;
  const v = (nombre, campo) => (m[nombre] && m[nombre].values[campo] !== undefined ? m[nombre].values[campo] : NaN);
  const ms = (x) => `${x.toFixed(1)} ms`;
  const umbrales = Object.entries(data.metrics)
    .flatMap(([nombre, met]) => Object.entries(met.thresholds || {}).map(([t, r]) => `| ${nombre} | ${t} | ${r.ok ? 'CUMPLE' : 'NO CUMPLE'} |`));
  const md = `# EQ-01 · ${ETIQUETA}

| Métrica | Valor |
| :--- | ---: |
| Usuarios virtuales máximos | ${v('vus_max', 'max')} |
| Peticiones totales | ${v('http_reqs', 'count')} |
| Peticiones por segundo | ${v('http_reqs', 'rate').toFixed(1)} |
| Cupos · promedio | ${ms(v('tiempo_cupos', 'avg'))} |
| Cupos · mediana | ${ms(v('tiempo_cupos', 'med'))} |
| Cupos · p95 | ${ms(v('tiempo_cupos', 'p(95)'))} |
| Cupos · p99 | ${ms(v('tiempo_cupos', 'p(99)'))} |
| Cupos · máximo | ${ms(v('tiempo_cupos', 'max'))} |
| Fechas · p95 | ${ms(v('tiempo_fechas', 'p(95)'))} |
| Errores 5xx | ${(v('errores_5xx', 'rate') * 100).toFixed(2)} % |
| Peticiones fallidas (cualquier causa) | ${(v('http_req_failed', 'rate') * 100).toFixed(2)} % |
| Checks correctos | ${(v('checks', 'rate') * 100).toFixed(2)} % |

| Métrica | Umbral | Resultado |
| :--- | :--- | :--- |
${umbrales.join('\n')}
`;
  return {
    [`resultados/${ETIQUETA}.json`]: JSON.stringify(data, null, 2),
    [`resultados/${ETIQUETA}.md`]: md,
    stdout: md,
  };
}
