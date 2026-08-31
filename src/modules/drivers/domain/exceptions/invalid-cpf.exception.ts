import { BadRequestException } from '@nestjs/common';

export class InvalidCpfException extends BadRequestException {
  constructor(cpf: string) {
    super(`O CPF informado (${cpf}) é inválido.`);
    this.name = 'InvalidCpfException';
  }
}