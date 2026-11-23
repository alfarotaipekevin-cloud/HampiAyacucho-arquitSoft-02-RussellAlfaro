import bcrypt from 'bcryptjs';
import { Hasheador } from '../dominio/hasheador';

export class HasheadorBcrypt implements Hasheador {
  constructor(private readonly costo = 10) {}

  hashear(texto: string) {
    return bcrypt.hash(texto, this.costo);
  }

  comparar(texto: string, hash: string) {
    return bcrypt.compare(texto, hash);
  }
}
