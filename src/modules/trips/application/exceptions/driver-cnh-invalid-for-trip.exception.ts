import { BadRequestException } from '@nestjs/common';

export class DriverCnhInvalidForTripException extends BadRequestException {
  constructor(
    message: string = 'Não é possível iniciar a viagem: CNH do motorista está vencida ou a 1 dia do vencimento.',
  ) {
    super(message);
    this.name = 'DriverCnhInvalidForTripException';
  }
}
