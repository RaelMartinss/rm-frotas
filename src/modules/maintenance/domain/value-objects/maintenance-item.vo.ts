import { randomUUID } from 'node:crypto';
import { Money } from './money.vo';

export interface MaintenanceItemProps {
  id?: string;
  name: string;
  cost: Money | number;
  quantity?: number;
}

export class MaintenanceItem {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _cost: Money;
  private readonly _quantity: number;

  constructor(props: MaintenanceItemProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('O nome do item/serviço é obrigatório.');
    }

    const qty = props.quantity !== undefined ? props.quantity : 1;
    if (qty <= 0 || !Number.isInteger(qty)) {
      throw new Error('A quantidade do item deve ser um número inteiro positivo.');
    }

    this._id = props.id ?? randomUUID();
    this._name = props.name.trim();
    this._cost = props.cost instanceof Money ? props.cost : new Money(props.cost);
    this._quantity = qty;
  }

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get cost(): Money {
    return this._cost;
  }

  public get quantity(): number {
    return this._quantity;
  }

  public getTotal(): Money {
    return this._cost.multiply(this._quantity);
  }
}
