import { InvalidKilometersException } from '../exceptions/invalid-kilometers.exception';

export class Kilometers {
  private readonly value: number;

  constructor(value: number) {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      throw new InvalidKilometersException('A quilometragem deve ser um número válido.');
    }

    if (!Number.isInteger(value)) {
      throw new InvalidKilometersException('A quilometragem deve ser um número inteiro.');
    }

    if (value < 0) {
      throw new InvalidKilometersException('A quilometragem não pode ser negativa.');
    }

    this.value = value;
  }

  public getValue(): number {
    return this.value;
  }

  public isLessThan(other: Kilometers): boolean {
    return this.value < other.getValue();
  }

  public isGreaterThan(other: Kilometers): boolean {
    return this.value > other.getValue();
  }

  public equals(other: Kilometers): boolean {
    return this.value === other.getValue();
  }
}
