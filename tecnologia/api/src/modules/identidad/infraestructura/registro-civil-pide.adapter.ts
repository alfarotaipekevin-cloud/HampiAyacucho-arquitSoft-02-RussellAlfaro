import { Dni } from '../../../shared/dominio/dni';
import { ClientePide } from '../../../shared/infraestructura/cliente-pide';
import { RegistroCivil } from '../dominio/registro-civil';

export class RegistroCivilPideAdapter implements RegistroCivil {
  constructor(private readonly pide: ClientePide) {}

  consultar(dni: Dni) {
    return this.pide.consultarDni(dni.valor);
  }
}
