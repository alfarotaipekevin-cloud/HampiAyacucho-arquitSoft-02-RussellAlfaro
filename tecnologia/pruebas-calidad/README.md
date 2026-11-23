# Pruebas de atributos de calidad (Sprint 2 del curso · actividad 8)

Cada carpeta valida uno o más escenarios de [08-escenarios-atributos-calidad.md](../../docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md).
El informe con los resultados está en [docs/07-validacion-calidad/03-validacion-atributos-calidad.md](../../docs/07-validacion-calidad/03-validacion-atributos-calidad.md).

| Escenario | Herramienta | Dónde | Cómo se ejecuta |
| :--- | :--- | :--- | :--- |
| EQ-01 Rendimiento | **k6** (hasta 2,000 usuarios virtuales) | `k6/eq01-disponibilidad.js` | `k6 run -e API_URL=http://localhost:3000 -e ETIQUETA=con-redis k6/eq01-disponibilidad.js` |
| EQ-02 Disponibilidad | **k6** + 2 instancias + balanceador; **Jest** | `disponibilidad/ejecutar-eq02.sh`, `api/src/pruebas/calidad/eq02-*.test.ts` | `./disponibilidad/ejecutar-eq02.sh` · `cd ../api && npm run test:calidad` |
| EQ-03 Escalabilidad | k6 (tendencia de EQ-01) | — | Ver el informe: 15,000 usuarios no se pueden generar con recursos gratuitos |
| EQ-04 Seguridad | **Jest** (matriz rol × endpoint) | `api/src/pruebas/calidad/eq04-seguridad.test.ts` | `cd ../api && npm run test:calidad` |
| EQ-05 Accesibilidad | **axe-core + Playwright** (WCAG 2.1 AA) | `web/e2e/accesibilidad.spec.ts` | `cd ../web && npx playwright test accesibilidad` |
| EQ-06 Mantenibilidad | **Jest** (regla de dependencias) | `api/src/pruebas/calidad/eq06-mantenibilidad.test.ts` | `cd ../api && npm run test:calidad` |
| BD y caché (actividad 5) | **psql** `EXPLAIN ANALYZE` | `bd/analisis-bd.sql` | `psql "$DATABASE_URL" -f bd/analisis-bd.sql > bd/resultados/analisis-bd.txt` |

## Entorno para k6

Las pruebas de carga se ejecutan **en local** (o en una máquina propia), no contra Render: el plan gratuito
tiene 512 MB de RAM y 0.1 CPU, y se suspende por inactividad, así que 2,000 usuarios medirían los límites del plan y no la arquitectura.

```bash
cd tecnologia && cp .env.example .env
docker compose up -d --build --wait                     # API con Redis
k6 run -e ETIQUETA=eq01-con-redis pruebas-calidad/k6/eq01-disponibilidad.js

CACHE_DESACTIVADA=true docker compose up -d api         # misma API sin caché
k6 run -e ETIQUETA=eq01-sin-cache pruebas-calidad/k6/eq01-disponibilidad.js
```

Prueba corta (para revisar que todo funciona): `-e VU_MAX=100 -e ESCALA=0.2`.

Los resultados (`.md` legible y `.json` completo de k6) quedan en `k6/resultados/`.
