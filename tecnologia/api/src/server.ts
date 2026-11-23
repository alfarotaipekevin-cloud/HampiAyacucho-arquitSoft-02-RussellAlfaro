import { Pool } from 'pg';
import { crearApp } from './app';
import { ConfiguracionInfraestructura, crearInfraestructuraMemoria, crearInfraestructuraPostgres } from './infraestructura';
import { Cache } from './shared/dominio/cache';
import { CacheMemoria, SinCache } from './shared/infraestructura/cache-memoria';
import { CacheRedis } from './shared/infraestructura/cache-redis';

/** ADR-004: Redis si hay REDIS_URL; CACHE_DESACTIVADA=true para medir sin caché (pruebas de carga). */
async function elegirCache(env: NodeJS.ProcessEnv): Promise<Cache> {
  if (env.CACHE_DESACTIVADA === 'true') return new SinCache();
  if (env.REDIS_URL) return new CacheRedis(env.REDIS_URL).conectar();
  return new CacheMemoria();
}

// Variables de entorno: docs/06-scrum/00-roadmap-y-despliegue.md, §2.

async function iniciar() {
  const env = process.env;
  const jwtSecreto = env.JWT_SECRET;
  if (!jwtSecreto || jwtSecreto.length < 32) {
    throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres');
  }

  const config: ConfiguracionInfraestructura = {
    jwtSecreto,
    jwtDuracionSegundos: Number(env.JWT_DURACION_SEGUNDOS ?? 1800),
    pide: {
      url: env.PIDE_URL ?? 'http://localhost:4001',
      usuario: env.PIDE_USUARIO ?? '40000000',
      password: env.PIDE_PASSWORD ?? 'clave-entidad',
      tiempoMaximoMs: Number(env.SERVICIOS_TIEMPO_MAXIMO_MS ?? 5000),
    },
    sms: {
      url: env.SMS_URL ?? 'http://localhost:4002',
      apiKey: env.SMS_API_KEY ?? 'clave-sms-local',
      tiempoMaximoMs: Number(env.SERVICIOS_TIEMPO_MAXIMO_MS ?? 5000),
    },
    cache: await elegirCache(env),
  };

  let infra;
  if (env.DATABASE_URL) {
    // Con Neon, la URL ya trae ?sslmode=require y pg activa SSL por sí solo.
    // Tamaño del pool: ver docs/07-validacion/analisis-base-de-datos.md (§ conexiones).
    const bd = new Pool({ connectionString: env.DATABASE_URL, max: Number(env.PG_POOL_MAX ?? 20) });
    infra = await crearInfraestructuraPostgres(config, bd);
  } else {
    console.warn('DATABASE_URL no está definida: los datos se guardan en memoria y se pierden al reiniciar.');
    infra = await crearInfraestructuraMemoria(config);
  }

  const origenesCors = (env.CORS_ORIGEN ?? 'http://localhost:4200').split(',').map((o) => o.trim()).filter(Boolean);
  const puerto = Number(env.PORT ?? 3000);
  crearApp(infra, { origenesCors }).listen(puerto, () => {
    console.log(`API Hampi en http://localhost:${puerto}/api/v1 (${env.DATABASE_URL ? 'PostgreSQL' : 'memoria'}, caché ${config.cache?.tipo})`);
  });
}

iniciar().catch((e) => {
  console.error('No se pudo iniciar la API:', e);
  process.exit(1);
});
