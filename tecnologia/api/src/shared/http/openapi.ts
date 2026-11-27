/**
 * Contrato OpenAPI 3.0 de la API Hampi (Sprint 2, actividad 4).
 * Se sirve en /api/docs (Swagger UI) y /api/docs/openapi.json.
 * Fuente: §5 de las specs 002, 003 y 004, §4 de la spec 005, y las specs 007 y 008.
 * La prueba pruebas/api/openapi.test.ts falla si una ruta de Express no está documentada aquí.
 */

const json = (schema: object, example?: unknown) => ({
  'application/json': { schema, ...(example !== undefined ? { example } : {}) },
});
const ref = (nombre: string) => ({ $ref: `#/components/schemas/${nombre}` });
const error = (descripcion: string, ...codigos: string[]) => ({
  description: `${descripcion}${codigos.length ? ` (${codigos.join(', ')})` : ''}`,
  content: json(ref('Error'), { error: { codigo: codigos[0] ?? 'ERROR', mensaje: descripcion } }),
});
const r401 = error('Falta el token, está vencido o fue alterado', 'SESION_REQUERIDA');
const r403 = error('El rol del usuario no tiene permiso', 'ROL_NO_AUTORIZADO');
const conToken = [{ bearerAuth: [] }];
const query = (name: string, descripcion: string, requerido = true, ejemplo?: string) => ({
  name, in: 'query', required: requerido, description: descripcion, schema: { type: 'string' }, ...(ejemplo ? { example: ejemplo } : {}),
});
const citaIdParam = { name: 'citaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

export const documentoOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Hampi Ayacucho · API del módulo de citas',
    version: '1.0.0',
    description:
      'Monolito modular con Clean Architecture (ADR-001, ADR-002). Módulos: Identidad, Portal y Citas. ' +
      'La PIDE/RENIEC y el SMS son simuladores propios (ADR-008). ' +
      'Para probar: 1) POST /identidad/registro con el ejemplo (DNI ficticio del simulador), 2) POST /identidad/sesion, 3) botón Authorize con el token.',
  },
  servers: [{ url: '/api/v1', description: 'Esta misma instancia' }],
  tags: [
    { name: 'Identidad', description: 'Registro, inicio de sesión y recuperación de contraseña (spec 002)' },
    { name: 'Portal', description: 'Tarjetas de módulos del paciente (spec 003)' },
    { name: 'Disponibilidad', description: 'Catálogo y cupos libres, con caché Redis (spec 004, ADR-004)' },
    { name: 'Citas', description: 'Reserva, ficha, cancelación y mis citas (spec 005)' },
    { name: 'Admisión', description: 'Recepción: agenda del día por servicio, lectura del QR y registro de llegada (spec 007). Rol PERSONAL_SALUD.' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['codigo', 'mensaje'],
            properties: { codigo: { type: 'string' }, mensaje: { type: 'string' } },
            additionalProperties: true,
          },
        },
      },
      Dni: { type: 'string', pattern: '^\\d{8}$', example: '70000001' },
      Rol: { type: 'string', enum: ['PACIENTE', 'PERSONAL_SALUD', 'ESPECIALISTA_GERESA', 'ADMINISTRADOR'] },
      Sesion: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          expiraEn: { type: 'integer', example: 1800 },
          usuario: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, rol: ref('Rol') } },
        },
      },
      Perfil: {
        type: 'object',
        properties: { id: { type: 'string' }, dni: ref('Dni'), nombreCompleto: { type: 'string' }, celular: { type: 'string' }, rol: ref('Rol') },
      },
      Especialidad: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' } }, example: { id: 'ped', nombre: 'Pediatría' } },
      Establecimiento: {
        type: 'object',
        properties: { id: { type: 'string' }, nombre: { type: 'string' }, nivel: { type: 'string' }, provincia: { type: 'string' } },
        example: { id: 'hra', nombre: 'Hospital Regional de Ayacucho', nivel: 'II-2', provincia: 'Huamanga' },
      },
      CupoLibre: {
        type: 'object',
        properties: { id: { type: 'string' }, fechaHora: { type: 'string', format: 'date-time' }, consultorio: { type: 'string' }, medico: { type: 'string' } },
        example: { id: 'c-0012', fechaHora: '2026-11-05T08:20:00-05:00', consultorio: 'Consultorio 3', medico: 'Dra. Ana Torres' },
      },
      EstadoCita: { type: 'string', enum: ['RESERVADA', 'CANCELADA', 'ATENDIDA', 'NO_ASISTIO'] },
      CitaDeAgenda: {
        type: 'object',
        properties: {
          citaId: { type: 'string' }, codigo: { type: 'string', example: 'HAMPI-7D73A2B1' },
          fechaHora: { type: 'string', example: '2026-11-23T09:00:00-05:00' },
          paciente: { type: 'string' }, dni: { type: 'string' }, consultorio: { type: 'string' }, medico: { type: 'string' },
          estado: ref('EstadoCita'),
          estadoAdmision: { type: 'string', enum: ['POR_LLEGAR', 'EN_ESPERA', 'ATENDIDA', 'NO_LLEGO', 'CANCELADA'] },
          llegadaEn: { type: 'string', nullable: true },
        },
      },
      Ficha: {
        type: 'object',
        properties: {
          citaId: { type: 'string' },
          codigo: { type: 'string', pattern: '^HAMPI-[0-9A-F]{8}$' },
          estado: ref('EstadoCita'),
          paciente: { type: 'string' },
          especialidad: { type: 'string' },
          establecimiento: { type: 'string' },
          consultorio: { type: 'string' },
          medico: { type: 'string' },
          fechaHora: { type: 'string', format: 'date-time' },
          qr: { type: 'string', description: 'Imagen PNG en data URL' },
          notificacion: { type: 'string', enum: ['ENVIADA', 'PENDIENTE'] },
          especialidadId: { type: 'string', example: 'ped' },
          establecimientoId: { type: 'string', example: 'hra' },
          reprogramacionesRestantes: { type: 'integer', minimum: 0, maximum: 2, description: 'Spec 008 · RR-03' },
        },
      },
      ResumenCita: {
        type: 'object',
        properties: {
          citaId: { type: 'string' }, codigo: { type: 'string' }, especialidad: { type: 'string' },
          establecimiento: { type: 'string' }, fechaHora: { type: 'string', format: 'date-time' }, estado: ref('EstadoCita'),
        },
      },
      Modulo: {
        type: 'object',
        properties: {
          clave: { type: 'string' }, nombre: { type: 'string' }, descripcion: { type: 'string' },
          estado: { type: 'string', enum: ['ACTIVO', 'PROXIMAMENTE'] }, ruta: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/identidad/registro/verificar': {
      post: {
        tags: ['Identidad'],
        summary: 'Verificar DNI y fecha de nacimiento contra RENIEC (simulado) antes de crear la cuenta',
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['dni', 'fechaNacimiento'], properties: { dni: ref('Dni'), fechaNacimiento: { type: 'string', format: 'date' } } },
            { dni: '70000002', fechaNacimiento: '1985-11-02' }),
        },
        responses: {
          200: { description: 'Identidad válida', content: json({ type: 'object', properties: { nombreCompleto: { type: 'string' } } }) },
          400: error('Formato inválido', 'DATOS_INVALIDOS'),
          409: error('El DNI no existe, la fecha no coincide o tiene restricción', 'IDENTIDAD_NO_VALIDA', 'DNI_RESTRINGIDO'),
          503: error('RENIEC no responde', 'SERVICIO_IDENTIDAD_NO_DISPONIBLE'),
        },
      },
    },
    '/identidad/registro': {
      post: {
        tags: ['Identidad'],
        summary: 'Crear cuenta de paciente (HU10)',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['dni', 'fechaNacimiento', 'celular', 'contrasena', 'aceptaTratamientoDatos'],
            properties: {
              dni: ref('Dni'), fechaNacimiento: { type: 'string', format: 'date' }, celular: { type: 'string', pattern: '^9\\d{8}$' },
              correo: { type: 'string', format: 'email' }, contrasena: { type: 'string', minLength: 8 }, aceptaTratamientoDatos: { type: 'boolean' },
            },
          }, { dni: '70000002', fechaNacimiento: '1985-11-02', celular: '987111222', contrasena: 'Hampi2026', aceptaTratamientoDatos: true }),
        },
        responses: {
          201: { description: 'Cuenta creada', content: json({ type: 'object', properties: { usuarioId: { type: 'string' }, nombreCompleto: { type: 'string' }, rol: ref('Rol') } }) },
          400: error('Datos inválidos o sin consentimiento', 'DATOS_INVALIDOS', 'CONSENTIMIENTO_REQUERIDO'),
          409: error('Identidad no válida, DNI restringido o cuenta existente', 'IDENTIDAD_NO_VALIDA', 'DNI_RESTRINGIDO', 'CUENTA_EXISTENTE'),
          503: error('RENIEC no responde', 'SERVICIO_IDENTIDAD_NO_DISPONIBLE'),
        },
      },
    },
    '/identidad/sesion': {
      post: {
        tags: ['Identidad'],
        summary: 'Iniciar sesión con número de documento y contraseña',
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['numeroDocumento', 'contrasena'], properties: { numeroDocumento: ref('Dni'), contrasena: { type: 'string' } } },
            { numeroDocumento: '70000002', contrasena: 'Hampi2026' }),
        },
        responses: {
          200: { description: 'Token JWT válido por 30 minutos', content: json(ref('Sesion')) },
          401: error('Credenciales incorrectas', 'CREDENCIALES_INVALIDAS'),
          423: error('Cuenta bloqueada 15 minutos tras 5 intentos fallidos', 'CUENTA_BLOQUEADA'),
        },
      },
    },
    '/identidad/recuperacion': {
      post: {
        tags: ['Identidad'],
        summary: 'Solicitar un código de recuperación por SMS (HU11)',
        requestBody: { required: true, content: json({ type: 'object', required: ['numeroDocumento'], properties: { numeroDocumento: ref('Dni') } }, { numeroDocumento: '70000001' }) },
        responses: {
          202: { description: 'Siempre 202, exista o no la cuenta', content: json({ type: 'object', properties: { mensaje: { type: 'string' }, celular: { type: 'string', example: '*****4321' } } }) },
        },
      },
    },
    '/identidad/recuperacion/confirmar': {
      post: {
        tags: ['Identidad'],
        summary: 'Cambiar la contraseña con el código recibido',
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['numeroDocumento', 'codigo', 'nuevaContrasena'], properties: { numeroDocumento: ref('Dni'), codigo: { type: 'string', pattern: '^\\d{6}$' }, nuevaContrasena: { type: 'string' } } }),
        },
        responses: {
          204: { description: 'Contraseña cambiada' },
          400: error('Código incorrecto', 'CODIGO_INVALIDO'),
          410: error('Código vencido (10 minutos)', 'CODIGO_VENCIDO'),
          429: error('Demasiados intentos', 'INTENTOS_AGOTADOS'),
        },
      },
    },
    '/identidad/yo': {
      get: {
        tags: ['Identidad'], summary: 'Perfil del usuario autenticado', security: conToken,
        responses: { 200: { description: 'Perfil', content: json(ref('Perfil')) }, 401: r401 },
      },
    },
    '/portal/modulos': {
      get: {
        tags: ['Portal'], summary: 'Tarjetas de módulos según el rol', security: conToken,
        responses: {
          200: { description: 'Usuario y módulos', content: json({ type: 'object', properties: { usuario: { type: 'object' }, modulos: { type: 'array', items: ref('Modulo') } } }) },
          401: r401,
        },
      },
    },
    '/citas/especialidades': {
      get: {
        tags: ['Disponibilidad'], summary: 'Especialidades con atención', security: conToken,
        responses: { 200: { description: 'Lista de especialidades', content: json({ type: 'array', items: ref('Especialidad') }) }, 401: r401, 403: r403 },
      },
    },
    '/citas/establecimientos': {
      get: {
        tags: ['Disponibilidad'], summary: 'Establecimientos que atienden una especialidad (RN-08)', security: conToken,
        parameters: [query('especialidadId', 'Id de la especialidad', true, 'ped')],
        responses: {
          200: { description: 'Lista de establecimientos', content: json({ type: 'array', items: ref('Establecimiento') }) },
          400: error('Falta el parámetro', 'DATOS_INVALIDOS'), 401: r401, 403: r403, 404: error('Especialidad inexistente'),
        },
      },
    },
    '/citas/cupos': {
      get: {
        tags: ['Disponibilidad'],
        summary: 'Cupos libres de un día (HU01). Respuesta cacheada en Redis (ADR-004)',
        description: 'Los cupos libres de cada día se guardan en caché 60 s y se invalidan al reservar o cancelar. Las estadísticas de aciertos se ven en GET /salud.',
        security: conToken,
        parameters: [
          query('especialidadId', 'Id de la especialidad', true, 'ped'),
          query('establecimientoId', 'Id del establecimiento', true, 'hra'),
          query('fecha', 'Fecha AAAA-MM-DD (hasta 30 días, RN-06)', true),
        ],
        responses: {
          200: {
            description: 'Cupos libres ordenados por hora',
            content: json({ type: 'array', items: ref('CupoLibre') }),
          },
          400: error('Parámetros faltantes o fecha inválida', 'DATOS_INVALIDOS'), 401: r401, 403: r403, 404: error('Especialidad o establecimiento inexistente'),
        },
      },
    },
    '/citas/cupos/fechas': {
      get: {
        tags: ['Disponibilidad'], summary: 'Fechas con al menos un cupo libre (calendario)', security: conToken,
        parameters: [query('especialidadId', 'Id de la especialidad', true, 'ped'), query('establecimientoId', 'Id del establecimiento', true, 'hra')],
        responses: {
          200: { description: 'Fechas AAAA-MM-DD', content: json({ type: 'array', items: { type: 'string', format: 'date' } }) },
          400: error('Parámetros faltantes', 'DATOS_INVALIDOS'), 401: r401, 403: r403,
        },
      },
    },
    '/citas': {
      post: {
        tags: ['Citas'], summary: 'Reservar una cita (HU02, HU03)', security: conToken,
        requestBody: { required: true, content: json({ type: 'object', required: ['cupoId'], properties: { cupoId: { type: 'string' } } }) },
        responses: {
          201: { description: 'Cita reservada; se envía el SMS de confirmación', content: json(ref('Ficha')) },
          400: error('Falta cupoId', 'DATOS_INVALIDOS'), 401: r401, 403: r403,
          404: error('Cupo inexistente', 'CUPO_NO_EXISTE'),
          409: error('Regla de negocio incumplida', 'CUPO_NO_DISPONIBLE', 'CUPO_VENCIDO', 'CITA_DUPLICADA', 'LIMITE_CITAS', 'IDENTIDAD_NO_VALIDA'),
          503: error('RENIEC no responde (RN-14)', 'SERVICIO_IDENTIDAD_NO_DISPONIBLE'),
        },
      },
    },
    '/citas/mias': {
      get: {
        tags: ['Citas'], summary: 'Mis citas, próximas primero', security: conToken,
        parameters: [{ name: 'estado', in: 'query', required: false, schema: ref('EstadoCita') }],
        responses: { 200: { description: 'Citas del paciente', content: json({ type: 'array', items: ref('ResumenCita') }) }, 401: r401, 403: r403 },
      },
    },
    '/citas/{citaId}': {
      get: {
        tags: ['Citas'], summary: 'Ver la ficha de una cita', security: conToken, parameters: [citaIdParam],
        responses: { 200: { description: 'Ficha', content: json(ref('Ficha')) }, 401: r401, 403: r403, 404: error('No existe o no es del paciente', 'CITA_NO_EXISTE') },
      },
    },
    '/citas/{citaId}/ficha.pdf': {
      get: {
        tags: ['Citas'], summary: 'Descargar la ficha en PDF (RF03)', security: conToken, parameters: [citaIdParam],
        responses: {
          200: { description: 'Ficha en PDF', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
          401: r401, 403: r403, 404: error('No existe o no es del paciente', 'CITA_NO_EXISTE'),
        },
      },
    },
    '/citas/{citaId}/cancelar': {
      patch: {
        tags: ['Citas'], summary: 'Cancelar una cita hasta 2 horas antes (RN-15)', security: conToken, parameters: [citaIdParam],
        responses: {
          200: { description: 'Cita cancelada; el cupo vuelve a estar libre', content: json(ref('Ficha')) },
          401: r401, 403: r403, 404: error('No existe o no es del paciente', 'CITA_NO_EXISTE'),
          409: error('No se puede cancelar', 'CITA_NO_RESERVADA', 'CITA_ATENDIDA', 'FUERA_DE_PLAZO'),
        },
      },
    },
    // Spec 008 · Reprogramar cita
    '/citas/{citaId}/reprogramar': {
      patch: {
        tags: ['Citas'],
        summary: 'Reprogramar una cita a otro horario del mismo servicio (spec 008)',
        description: 'Hasta 2 horas antes y como máximo 2 veces por cita. El código QR no cambia y se envía un SMS con la nueva fecha. Si otro paciente gana el nuevo cupo, la cita sigue como estaba (RR-08).',
        security: conToken, parameters: [citaIdParam],
        requestBody: { required: true, content: json({ type: 'object', required: ['cupoId'], properties: { cupoId: { type: 'string' } } }) },
        responses: {
          200: { description: 'Cita reprogramada; el cupo anterior vuelve a estar libre', content: json(ref('Ficha')) },
          400: error('Falta cupoId', 'DATOS_INVALIDOS'), 401: r401, 403: r403,
          404: error('Cita o cupo inexistente', 'CITA_NO_EXISTE', 'CUPO_NO_EXISTE'),
          409: error('Regla de negocio incumplida', 'CUPO_NO_DISPONIBLE', 'FUERA_DE_PLAZO', 'LIMITE_REPROGRAMACIONES', 'OTRO_SERVICIO',
            'MISMO_CUPO', 'CUPO_VENCIDO', 'FUERA_DE_APERTURA', 'CITA_DUPLICADA', 'CITA_NO_RESERVADA', 'CITA_ATENDIDA', 'LLEGADA_YA_REGISTRADA', 'CITA_CAMBIADA'),
        },
      },
    },
      // Spec 007 · Admisión con QR
    '/citas/admision/servicios': {
      get: {
        tags: ['Admisión'], summary: 'Establecimiento del personal y servicios que atiende (RA-01)', security: conToken,
        responses: { 200: { description: 'Establecimiento y especialidades' }, 401: r401, 403: error('Rol no autorizado o cuenta sin establecimiento', 'ROL_NO_AUTORIZADO', 'SIN_ESTABLECIMIENTO') },
      },
    },
    '/citas/admision/agenda': {
      get: {
        tags: ['Admisión'], summary: 'Citas de hoy de un servicio, con resumen (RA-02)', security: conToken,
        parameters: [
          query('especialidadId', 'Servicio elegido por la recepción', true, 'ped'),
          query('fecha', 'Otro día AAAA-MM-DD de los próximos 7, solo para consultar (RA-06). Por defecto, hoy', false),
        ],
        responses: {
          200: { description: 'Agenda del día', content: json({ type: 'object', properties: { fecha: { type: 'string' }, soloConsulta: { type: 'boolean' }, resumen: { type: 'object' }, citas: { type: 'array', items: ref('CitaDeAgenda') } } }) },
          400: error('Falta el servicio o la fecha no es válida', 'ESPECIALIDAD_REQUERIDA', 'DATOS_INVALIDOS', 'FECHA_FUERA_DE_RANGO'), 401: r401, 403: r403, 404: error('El establecimiento no atiende ese servicio', 'SERVICIO_NO_EXISTE'),
        },
      },
    },
    '/citas/admision/dias': {
      get: {
        tags: ['Admisión'], summary: 'Hoy y los próximos 7 días de atención, con cuántas citas tiene cada uno (RA-06)', security: conToken,
        parameters: [query('especialidadId', 'Servicio elegido por la recepción', true, 'ped')],
        responses: {
          200: { description: 'Días', content: json({ type: 'array', items: { type: 'object', properties: { fecha: { type: 'string', format: 'date' }, hoy: { type: 'boolean' }, citas: { type: 'integer' } } } }) },
          400: error('Falta el servicio', 'ESPECIALIDAD_REQUERIDA'), 401: r401, 403: r403, 404: error('El establecimiento no atiende ese servicio', 'SERVICIO_NO_EXISTE'),
        },
      },
    },
    '/citas/admision/codigo/{codigo}': {
      get: {
        tags: ['Admisión'], summary: 'Buscar la cita por el código del QR (RN-12)', security: conToken,
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'HAMPI-7D73A2B1' } }],
        responses: {
          200: { description: 'Cita, si se puede registrar la llegada y el motivo si no', content: json(ref('CitaDeAgenda')) },
          400: error('Formato de código inválido', 'CODIGO_INVALIDO'), 401: r401, 403: r403, 404: error('No existe', 'CITA_NO_EXISTE'),
        },
      },
    },
    '/citas/admision/{citaId}/llegada': {
      post: {
        tags: ['Admisión'], summary: 'Registrar la llegada del paciente (RA-01 a RA-04)', security: conToken, parameters: [citaIdParam],
        responses: {
          200: { description: 'Paciente en espera', content: json(ref('CitaDeAgenda')) },
          401: r401, 403: r403, 404: error('No existe o es de otro establecimiento', 'CITA_NO_EXISTE'),
          409: error('No se puede registrar', 'CITA_NO_RESERVADA', 'LLEGADA_YA_REGISTRADA', 'CITA_DE_OTRO_DIA', 'FUERA_DE_TOLERANCIA'),
        },
      },
    },
    '/citas/admision/{citaId}/atencion': {
      post: {
        tags: ['Admisión'], summary: 'Marcar la cita como atendida (RA-05, RN-04)', security: conToken, parameters: [citaIdParam],
        responses: {
          200: { description: 'Cita atendida', content: json(ref('CitaDeAgenda')) },
          401: r401, 403: r403, 404: error('No existe o es de otro establecimiento', 'CITA_NO_EXISTE'),
          409: error('No se puede atender', 'SIN_LLEGADA', 'CITA_NO_RESERVADA'),
        },
      },
    },
  },
} as const;
