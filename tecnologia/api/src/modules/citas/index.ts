// API pública del módulo Citas.
export { crearModuloCitas, TARJETA_CITAS, TARJETA_ADMISION } from './citas.module';
export type { DependenciasCitas } from './citas.module';
export type { DatosCupo } from './dominio/cupo';
export type { Especialidad, Establecimiento } from './dominio/catalogo';
export type { ValidadorIdentidad, Notificador, AvisoCita, DirectorioPacientes, GeneradorQR } from './dominio/servicios-externos';
export { CatalogoMemoriaRepository, CuposMemoriaRepository, CitasMemoriaRepository, PersonalMemoriaRepository } from './infraestructura/memoria.repositories';
export { CatalogoPostgresRepository, CuposPostgresRepository, CitasPostgresRepository, PersonalPostgresRepository } from './infraestructura/postgres.repositories';
export { PideValidadorAdapter, SmsNotificadorAdapter, QrPngAdapter, textoSmsCita } from './infraestructura/adaptadores';
export { PdfFichaAdapter } from './infraestructura/pdf-ficha.adapter';
export type { ExportadorFicha, FichaCita } from './aplicacion/ficha-cita';
