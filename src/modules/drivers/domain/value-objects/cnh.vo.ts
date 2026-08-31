import { InvalidCnhException } from '../exceptions/invalid-cnh.exception';

export type CnhCategory =
  'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';

export class Cnh {
  private readonly number: string;
  private readonly category: CnhCategory;
  private readonly expirationDate: Date;

  constructor(number: string, category: string, expirationDate: Date) {
    const cleanedNumber = number.replace(/\D/g, '');

    if (!this.validateNumber(cleanedNumber)) {
      throw new InvalidCnhException(
        'O número da CNH deve conter exatamente 11 dígitos numéricos.',
      );
    }

    const upperCategory = category.toUpperCase() as CnhCategory;
    if (!this.validateCategory(upperCategory)) {
      throw new InvalidCnhException(
        `A categoria '${category}' não é uma categoria válida de CNH.`,
      );
    }

    this.number = cleanedNumber;
    this.category = upperCategory;
    this.expirationDate = expirationDate;
  }

  public getNumber(): string {
    return this.number;
  }
  public getCategory(): CnhCategory {
    return this.category;
  }

  public getExpirationDate(): Date {
    return this.expirationDate;
  }

  public isExpired(referenceDate: Date = new Date()): boolean {
    return this.expirationDate.getTime() < referenceDate.getTime();
  }

  public equals(other: Cnh): boolean {
    return this.number === other.getNumber();
  }

  private validateNumber(number: string): boolean {
    return number.length === 11;
  }

  private validateCategory(category: string): boolean {
    const validCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
    return validCategories.includes(category);
  }
}
