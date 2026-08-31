import { BadRequestException } from '@nestjs/common';

export class InvalidCnhException extends BadRequestException {
  constructor(reason: string) {
    super(`CNH inválida: ${reason}`);
    this.name = 'InvalidCnhException';
  }
}