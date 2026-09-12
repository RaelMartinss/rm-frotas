export class InvalidKilometrageException extends Error {
  constructor(message = 'A nova quilometragem não pode ser menor que a quilometragem atual.') {
    super(message);
    this.name = 'InvalidKilometrageException';
  }
}