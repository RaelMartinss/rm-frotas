export class InvalidKilometrageException extends Error {
  constructor() {
    super('A nova quilometragem não pode ser menor que a quilometragem atual.');
    this.name = 'InvalidKilometrageException';
  }
}