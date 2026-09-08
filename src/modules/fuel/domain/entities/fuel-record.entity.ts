import { randomUUID } from 'node:crypto';
import { FuelType } from '../enums/fuel-type.enum';
import { Money } from '../../../../shared/domain/value-objects/money.vo';
import {
  InvalidFuelAmountException,
  InvalidFuelCostException,
} from '../exceptions/fuel.exceptions';

export interface FuelRecordProps {
  vehicleId: string;
  driverId: string;
  clientId?: string;
  ownerId: string;
  fuelType: FuelType;
  liters: number;
  pricePerUnit: Money;
  totalCost: Money;
  odometerAtFueling: number;
  gasStation?: string | null;
  fullTank: boolean;
  receiptUrl?: string | null;
  fueledAt: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFuelRecordProps {
  vehicleId: string;
  driverId: string;
  clientId?: string;
  ownerId: string;
  fuelType: FuelType;
  liters: number;
  pricePerUnit?: Money | number;
  totalCost?: Money | number;
  odometerAtFueling: number;
  gasStation?: string | null;
  fullTank?: boolean;
  receiptUrl?: string | null;
  fueledAt?: Date;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateFuelRecordProps {
  fuelType?: FuelType;
  liters?: number;
  pricePerUnit?: Money | number;
  totalCost?: Money | number;
  gasStation?: string | null;
  fullTank?: boolean;
  receiptUrl?: string | null;
  fueledAt?: Date;
  notes?: string | null;
}

export class FuelRecord {
  private readonly id: string;
  private props: FuelRecordProps;

  constructor(props: CreateFuelRecordProps, id?: string) {
    if (props.liters <= 0) {
      throw new InvalidFuelAmountException();
    }

    const pricePerUnit =
      props.pricePerUnit instanceof Money
        ? props.pricePerUnit
        : Money.create(props.pricePerUnit ?? (props.totalCost ? Number(props.totalCost) / props.liters : 0));

    const totalCost =
      props.totalCost instanceof Money
        ? props.totalCost
        : Money.create(
            props.totalCost !== undefined && props.totalCost !== null
              ? Number(props.totalCost)
              : pricePerUnit.amount * props.liters
          );

    if (totalCost.amount <= 0) {
      throw new InvalidFuelCostException();
    }

    this.id = id ?? randomUUID();
    this.props = {
      vehicleId: props.vehicleId,
      driverId: props.driverId,
      clientId: props.clientId,
      ownerId: props.ownerId,
      fuelType: props.fuelType,
      liters: props.liters,
      pricePerUnit,
      totalCost,
      odometerAtFueling: props.odometerAtFueling,
      gasStation: props.gasStation ?? null,
      fullTank: props.fullTank ?? true,
      receiptUrl: props.receiptUrl ?? null,
      fueledAt: props.fueledAt ?? new Date(),
      notes: props.notes ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  public update(updateProps: UpdateFuelRecordProps): void {
    if (updateProps.liters !== undefined && updateProps.liters <= 0) {
      throw new InvalidFuelAmountException();
    }

    let nextLiters = updateProps.liters ?? this.props.liters;

    let nextPricePerUnit = this.props.pricePerUnit;
    if (updateProps.pricePerUnit !== undefined) {
      nextPricePerUnit =
        updateProps.pricePerUnit instanceof Money
          ? updateProps.pricePerUnit
          : Money.create(updateProps.pricePerUnit);
    }

    let nextTotalCost = this.props.totalCost;
    if (updateProps.totalCost !== undefined) {
      nextTotalCost =
        updateProps.totalCost instanceof Money
          ? updateProps.totalCost
          : Money.create(updateProps.totalCost);
    } else if (updateProps.pricePerUnit !== undefined || updateProps.liters !== undefined) {
      nextTotalCost = Money.create(nextPricePerUnit.amount * nextLiters);
    }

    if (nextTotalCost.amount <= 0) {
      throw new InvalidFuelCostException();
    }

    if (updateProps.fuelType) this.props.fuelType = updateProps.fuelType;
    this.props.liters = nextLiters;
    this.props.pricePerUnit = nextPricePerUnit;
    this.props.totalCost = nextTotalCost;
    if (updateProps.gasStation !== undefined) this.props.gasStation = updateProps.gasStation;
    if (updateProps.fullTank !== undefined) this.props.fullTank = updateProps.fullTank;
    if (updateProps.receiptUrl !== undefined) this.props.receiptUrl = updateProps.receiptUrl;
    if (updateProps.fueledAt) this.props.fueledAt = updateProps.fueledAt;
    if (updateProps.notes !== undefined) this.props.notes = updateProps.notes;

    this.props.updatedAt = new Date();
  }

  public getId(): string { return this.id; }
  public getVehicleId(): string { return this.props.vehicleId; }
  public getDriverId(): string { return this.props.driverId; }
  public getClientId(): string | undefined { return this.props.clientId; }
  public getOwnerId(): string { return this.props.ownerId; }
  public getFuelType(): FuelType { return this.props.fuelType; }
  public getLiters(): number { return this.props.liters; }
  public getPricePerUnit(): Money { return this.props.pricePerUnit; }
  public getTotalCost(): Money { return this.props.totalCost; }
  public getOdometerAtFueling(): number { return this.props.odometerAtFueling; }
  public getGasStation(): string | null | undefined { return this.props.gasStation; }
  public isFullTank(): boolean { return this.props.fullTank; }
  public getReceiptUrl(): string | null | undefined { return this.props.receiptUrl; }
  public getFueledAt(): Date { return this.props.fueledAt; }
  public getNotes(): string | null | undefined { return this.props.notes; }
  public getCreatedAt(): Date { return this.props.createdAt; }
  public getUpdatedAt(): Date { return this.props.updatedAt; }
}
