/** Puerto para guardar contraseñas sin texto plano (RI-05). */
export interface Hasheador {
  hashear(texto: string): Promise<string>;
  comparar(texto: string, hash: string): Promise<boolean>;
}
