import { NotFoundException } from '@nestjs/common';

export class DriverNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Motorista com ID '${id}' não foi encontrado.`);
    this.name = 'DriverNotFoundException';
  }
}