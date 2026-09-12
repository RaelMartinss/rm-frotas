export class InvalidKilometersException extends Error {
  constructor(message: string = 'Valor de quilometragem inválido. Deve ser um número inteiro maior ou igual a zero.') {
    super(message);
    this.name = 'InvalidKilometersException';
  }
}
