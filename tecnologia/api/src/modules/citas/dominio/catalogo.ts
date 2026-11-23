export interface Especialidad {
  id: string;
  nombre: string;
}

export interface Establecimiento {
  id: string;
  nombre: string;
  nombreCorto: string; // para el SMS (160 caracteres)
  nivel: string;
  provincia: string;
  direccion: string;
}
