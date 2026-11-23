import jwt from 'jsonwebtoken';
import { ROLES, UsuarioAutenticado } from '../../../shared/dominio/usuario-autenticado';
import { EmisorTokens } from '../dominio/emisor-tokens';

/** RI-09: JWT firmado (HS256) con sub, dni, nombre y rol. */
export class EmisorJwt implements EmisorTokens {
  constructor(
    private readonly secreto: string,
    private readonly duracionSegundos = 30 * 60,
  ) {}

  emitir(usuario: UsuarioAutenticado) {
    const token = jwt.sign({ dni: usuario.dni, nombre: usuario.nombre, rol: usuario.rol }, this.secreto, {
      algorithm: 'HS256',
      subject: usuario.id,
      expiresIn: this.duracionSegundos,
    });
    return { token, expiraEn: this.duracionSegundos };
  }

  verificar(token: string): UsuarioAutenticado | null {
    try {
      const datos = jwt.verify(token, this.secreto, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      if (typeof datos.sub !== 'string' || !ROLES.includes(datos.rol)) return null;
      return { id: datos.sub, dni: datos.dni, nombre: datos.nombre, rol: datos.rol };
    } catch {
      return null; // vencido, alterado o mal formado
    }
  }
}
