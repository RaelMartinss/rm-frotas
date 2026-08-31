import { ConflictException } from '@nestjs/common';

export class DriverAlreadyExistsException extends ConflictException {
  constructor(cpf: string) {
    super(`Já existe um motorista cadastrado com o CPF informado (${cpf}).`);
    this.name = 'DriverAlreadyExistsException';
  }
}