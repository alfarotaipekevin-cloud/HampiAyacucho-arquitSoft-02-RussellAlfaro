import { Pool } from 'pg';
import { sembrarCitasDelDia } from './db/citas-demo';
import { CONTRASENA_DEMO, ESPECIALIDADES, ESTABLECIMIENTOS, OFERTAS, PERSONAL_DEMO, USUARIOS_DEMO, generarCupos, sembrarPostgres } from './db/semilla';
import { migrar } from './db/migrador';
import { Infraestructura } from './app';
import {
  CatalogoMemoriaRepository, CatalogoPostgresRepository, CitasMemoriaRepository, CitasPostgresRepository,
  CuposMemoriaRepository, CuposPostgresRepository, PersonalMemoriaRepository, PersonalPostgresRepository, PdfFichaAdapter, PideValidadorAdapter, QrPngAdapter, SmsNotificadorAdapter,
} from './modules/citas';
import {
  CodigosMemoriaRepository, CodigosPostgresRepository, EmisorJwt, HasheadorBcrypt, RegistroCivilPideAdapter, SmsMensajeroAdapter, Usuario, UsuariosMemoriaRepository, UsuariosPostgresRepository,
} from './modules/identidad';
import { Cache } from './shared/dominio/cache';
import { Reloj, relojDelSistema } from './shared/dominio/reloj';
import { CacheMemoria } from './shared/infraestructura/cache-memoria';
import { CitasConInvalidacionRepository, CuposConCacheRepository } from './modules/citas/infraestructura/cache-cupos';
import { ClientePide, ConfiguracionPide } from './shared/infraestructura/cliente-pide';
import { ClienteSms, ConfiguracionSms } from './shared/infraestructura/cliente-sms';

export interface ConfiguracionInfraestructura {
  jwtSecreto: string;
  jwtDuracionSegundos?: number;
  pide: ConfiguracionPide;
  sms: ConfiguracionSms;
  reloj?: Reloj;
  costoBcrypt?: number;
  /** Caché de cupos (ADR-004): Redis en producción; por defecto, memoria local. */
  cache?: Cache;
  /** CITAS_DEMO=true: reserva cada día citas ficticias para que la demo de admisión nunca esté vacía (solo PostgreSQL). */
  citasDemo?: boolean;
}

/** Puertos que no dependen de dónde se guardan los datos: PIDE, SMS, QR, PDF, JWT y bcrypt. */
function serviciosComunes(c: ConfiguracionInfraestructura) {
  const pide = new ClientePide(c.pide);
  const sms = new ClienteSms(c.sms);
  return {
    registroCivil: new RegistroCivilPideAdapter(pide),
    validadorIdentidad: new PideValidadorAdapter(pide),
    notificador: new SmsNotificadorAdapter(sms),
    mensajeroIdentidad: new SmsMensajeroAdapter(sms),
    qr: new QrPngAdapter(),
    exportadorFicha: new PdfFichaAdapter(),
    hasheador: new HasheadorBcrypt(c.costoBcrypt),
    emisor: new EmisorJwt(c.jwtSecreto, c.jwtDuracionSegundos),
    reloj: c.reloj ?? relojDelSistema,
  };
}

/** Todo en memoria (se pierde al reiniciar): pruebas y desarrollo sin PostgreSQL. */
export async function crearInfraestructuraMemoria(c: ConfiguracionInfraestructura): Promise<Infraestructura> {
  const comunes = serviciosComunes(c);
  const usuarios = new UsuariosMemoriaRepository();
  const hash = await comunes.hasheador.hashear(CONTRASENA_DEMO);
  for (const u of USUARIOS_DEMO) {
    await usuarios.crear(Usuario.restaurar({
      ...u, id: `demo-${u.dni}`, fechaNacimiento: '1988-08-08', celular: '999999999', correo: null,
      hashContrasena: hash, intentosFallidos: 0, bloqueadoHasta: null,
    }));
  }
  const cupos = new CuposMemoriaRepository(generarCupos(comunes.reloj.ahora()));
  return {
    ...comunes,
    usuarios,
    codigos: new CodigosMemoriaRepository(),
    catalogo: new CatalogoMemoriaRepository(ESPECIALIDADES, ESTABLECIMIENTOS, OFERTAS),
    personal: new PersonalMemoriaRepository(PERSONAL_DEMO),
    ...conCache(cupos, new CitasMemoriaRepository(cupos), c.cache ?? new CacheMemoria()),
  };
}

/** PostgreSQL: aplica las migraciones pendientes y siembra el catálogo, los cupos y las cuentas demo. */
export async function crearInfraestructuraPostgres(c: ConfiguracionInfraestructura, bd: Pool): Promise<Infraestructura> {
  const comunes = serviciosComunes(c);
  await migrar(bd);
  const hashDemo = await comunes.hasheador.hashear(CONTRASENA_DEMO);
  await sembrarPostgres(bd, comunes.reloj.ahora(), async () => hashDemo);
  if (c.citasDemo) {
    // Cada 30 minutos: cupos de los días nuevos y citas de demostración del día, que avanzan con la hora.
    const refrescar = async () => {
      await sembrarPostgres(bd, comunes.reloj.ahora(), async () => hashDemo);
      const n = await sembrarCitasDelDia(bd, comunes.reloj.ahora(), hashDemo, c.cache);
      if (n) console.log(`Citas de demostración: ${n} nuevas para hoy`);
    };
    await refrescar();
    setInterval(() => refrescar().catch((e) => console.error('No se pudieron refrescar las citas de demostración:', e)), 30 * 60 * 1000).unref();
  }
  return {
    ...comunes,
    usuarios: new UsuariosPostgresRepository(bd),
    codigos: new CodigosPostgresRepository(bd),
    catalogo: new CatalogoPostgresRepository(bd),
    personal: new PersonalPostgresRepository(bd),
    ...conCache(new CuposPostgresRepository(bd), new CitasPostgresRepository(bd), c.cache ?? new CacheMemoria()),
  };
}

/** Envuelve los repositorios con la caché (patrón Decorator): los casos de uso no cambian. */
function conCache(cupos: Infraestructura['cupos'], citas: Infraestructura['citas'], cache: Cache) {
  return {
    cache,
    cupos: new CuposConCacheRepository(cupos, cache),
    citas: new CitasConInvalidacionRepository(citas, cache),
  };
}
