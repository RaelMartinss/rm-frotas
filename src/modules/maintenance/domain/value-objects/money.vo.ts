import { InvalidMoneyAmountException } from '../exceptions/maintenance.exceptions';

export class Money {
  private readonly _amount: number;

  constructor(amount: number) {
    if (isNaN(amount) || amount < 0) {
      throw new InvalidMoneyAmountException('O valor não pode ser negativo ou inválido.');
    }
    // Arredonda para 2 casas decimais
    this._amount = Math.round(amount * 100) / 100;
  }

  public get amount(): number {
    return this._amount;
  }

  public add(other: Money): Money {
    return new Money(this._amount + other.amount);
  }

  public multiply(factor: number): Money {
    if (factor < 0) {
      throw new InvalidMoneyAmountException('Multiplicador não pode ser negativo.');
    }
    return new Money(this._amount * factor);
  }

  public equals(other: Money): boolean {
    return this._amount === other.amount;
  }

  public static zero(): Money {
    return new Money(0);
  }

  public static create(amount?: number | null): Money {
    return new Money(amount ?? 0);
  }

  public toFormattedString(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this._amount);
  }
}
