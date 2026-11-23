import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { crearApp, Infraestructura } from '../app';
import { crearInfraestructuraMemoria } from '../infraestructura';
import { AvisoCita } from '../modules/citas';
import { Dni } from '../shared/dominio/dni';
import { ServicioExternoError } from '../shared/dominio/errores';
import { PersonaRegistroCivil, ResultadoConsultaDni } from '../shared/dominio/registro-civil';
import { Reloj } from '../shared/dominio/reloj';

/** Miércoles 4 de noviembre de 2026, 10:00 en Lima. Los cupos de la semilla se generan desde aquí. */
export const AHORA = new Date('2026-11-04T10:00:00-05:00');

export class RelojFijo implements Reloj {
  constructor(public actual = new Date(AHORA)) {}
  ahora() { return new Date(this.actual); }
  avanzarMinutos(minutos: number) { this.actual = new Date(this.actual.getTime() + minutos * 60_000); }
}

/** Mismas personas ficticias que el simulador PIDE (spec 001, §3.3). */
const PERSONAS: (PersonaRegistroCivil & { restriccion?: string })[] = [
  { dni: '70000001', nombres: 'María Elena', apellidoPaterno: 'Quispe', apellidoMaterno: 'Huamán', fechaNacimiento: '1990-04-15' },
  { dni: '70000002', nombres: 'José Luis', apellidoPaterno: 'Huamán', apellidoMaterno: 'Cárdenas', fechaNacimiento: '1985-11-02' },
  { dni: '70000003', nombres: 'Rosa', apellidoPaterno: 'Pariona', apellidoMaterno: 'Gamboa', fechaNacimiento: '2015-07-20' },
  { dni: '70000004', nombres: 'Carlos', apellidoPaterno: 'Ccahuana', apellidoMaterno: 'Ore', fechaNacimiento: '1970-01-30', restriccion: 'FALLECIDO' },
];

/** Doble de prueba de la PIDE: sirve como RegistroCivil (Identidad) y como ValidadorIdentidad (Citas). */
export class PideFalsa {
  caida = false;
  consultas = 0;

  async consultar(dni: Dni): Promise<ResultadoConsultaDni> {
    this.consultas++;
    if (this.caida) throw new ServicioExternoError('SERVICIO_IDENTIDAD_NO_DISPONIBLE', 'RENIEC no responde');
    const p = PERSONAS.find((x) => x.dni === dni.valor);
    if (!p) return { estado: 'NO_EXISTE' };
    const { restriccion, ...persona } = p;
    return restriccion ? { estado: 'RESTRINGIDO', motivo: restriccion, persona } : { estado: 'VALIDO', persona };
  }

  async esVigente(dni: Dni) {
    return (await this.consultar(dni)).estado === 'VALIDO';
  }
}

export class NotificadorFalso {
  caido = false;
  avisos: AvisoCita[] = [];
  async citaReservada(aviso: AvisoCita) {
    if (this.caido) return false;
    this.avisos.push(aviso);
    return true;
  }
}

/** Guarda el último código de recuperación enviado a cada celular. */
export class MensajeroFalso {
  codigos = new Map<string, string>();
  async enviarCodigo(celular: string, codigo: string) {
    this.codigos.set(celular, codigo);
    return true;
  }
}

export interface Entorno {
  url: string;
  infra: Infraestructura;
  reloj: RelojFijo;
  pide: PideFalsa;
  sms: NotificadorFalso;
  mensajero: MensajeroFalso;
  cerrar(): Promise<void>;
}

export const SECRETO_PRUEBAS = 'secreto-de-pruebas-con-mas-de-32-caracteres';

/** Levanta la API completa en memoria, con la PIDE y el SMS falsos, en un puerto libre. */
export async function levantarEntorno(): Promise<Entorno> {
  const reloj = new RelojFijo();
  const pide = new PideFalsa();
  const sms = new NotificadorFalso();
  const mensajero = new MensajeroFalso();
  const infra = await crearInfraestructuraMemoria({
    jwtSecreto: SECRETO_PRUEBAS,
    pide: { url: 'http://no-se-usa', usuario: '', password: '' },
    sms: { url: 'http://no-se-usa', apiKey: '' },
    reloj,
    costoBcrypt: 4,
  });
  infra.registroCivil = pide;
  infra.validadorIdentidad = pide;
  infra.notificador = sms;
  infra.mensajeroIdentidad = mensajero;

  const servidor: Server = await new Promise((listo) => {
    const s = crearApp(infra).listen(0, () => listo(s));
  });
  return {
    url: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`,
    infra, reloj, pide, sms, mensajero,
    cerrar: () => new Promise((fin) => servidor.close(() => fin())),
  };
}

export interface Respuesta {
  estado: number;
  cuerpo: any;
}

export async function llamar(url: string, metodo: string, ruta: string, cuerpo?: object, token?: string): Promise<Respuesta> {
  const r = await fetch(`${url}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { estado: r.status, cuerpo: texto ? JSON.parse(texto) : null };
}

export const DATOS_MARIA = {
  dni: '70000001', fechaNacimiento: '1990-04-15', celular: '987654321',
  correo: 'maria@example.com', contrasena: 'Hampi2026', aceptaTratamientoDatos: true,
};
export const DATOS_JOSE = {
  dni: '70000002', fechaNacimiento: '1985-11-02', celular: '912345678',
  contrasena: 'Clave2026', aceptaTratamientoDatos: true,
};

/** Crea la cuenta (si hace falta) e inicia sesión; devuelve el token. */
export async function entrar(url: string, datos: { dni: string; contrasena: string }): Promise<string> {
  await llamar(url, 'POST', '/api/v1/identidad/registro', datos);
  const r = await llamar(url, 'POST', '/api/v1/identidad/sesion', { numeroDocumento: datos.dni, contrasena: datos.contrasena });
  if (r.estado !== 200) throw new Error(`No se pudo iniciar sesión: ${JSON.stringify(r.cuerpo)}`);
  return r.cuerpo.token;
}
