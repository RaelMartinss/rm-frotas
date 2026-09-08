import { randomUUID } from 'node:crypto';
import { MaintenanceType } from '../enums/maintenance-type.enum';
import { MaintenanceStatus } from '../enums/maintenance-status.enum';
import { Money } from '../value-objects/money.vo';
import { MaintenanceItem } from '../value-objects/maintenance-item.vo';
import {
  InvalidMaintenanceDateException,
  InvalidOdometerReadingException,
  MaintenanceAlreadyFinishedException,
  MaintenanceNotInProgressException,
} from '../exceptions/maintenance.exceptions';

export interface MaintenanceProps {
  id?: string;
  vehicleId: string;
  clientId?: string;
  ownerId: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  description: string;
  serviceProvider?: string | null;
  scheduledDate?: Date | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  odometerAtService?: number | null;
  cost?: Money | number;
  items?: MaintenanceItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface MaintenanceInternalProps {
  id: string;
  vehicleId: string;
  clientId?: string;
  ownerId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  serviceProvider?: string | null;
  scheduledDate?: Date | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  odometerAtService?: number | null;
  cost: Money;
  items: MaintenanceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class Maintenance {
  private props: MaintenanceInternalProps;

  constructor(props: MaintenanceProps) {
    const items = props.items ?? [];
    let initialCost: Money;

    if (items.length > 0) {
      initialCost = items.reduce((acc, item) => acc.add(item.getTotal()), Money.zero());
    } else if (props.cost instanceof Money) {
      initialCost = props.cost;
    } else if (typeof props.cost === 'number') {
      initialCost = new Money(props.cost);
    } else {
      initialCost = Money.zero();
    }

    this.props = {
      id: props.id ?? randomUUID(),
      vehicleId: props.vehicleId,
      clientId: props.clientId,
      ownerId: props.ownerId,
      type: props.type ?? MaintenanceType.PREVENTIVA,
      status: props.status ?? MaintenanceStatus.AGENDADA,
      description: props.description,
      serviceProvider: props.serviceProvider ?? null,
      scheduledDate: props.scheduledDate ?? null,
      startedAt: props.startedAt ?? null,
      finishedAt: props.finishedAt ?? null,
      odometerAtService: props.odometerAtService ?? null,
      cost: initialCost,
      items,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  public start(startedAt?: Date): void {
    if (
      this.props.status === MaintenanceStatus.CONCLUIDA ||
      this.props.status === MaintenanceStatus.CANCELADA
    ) {
      throw new MaintenanceAlreadyFinishedException();
    }

    if (this.props.status === MaintenanceStatus.EM_ANDAMENTO) {
      return;
    }

    this.props.status = MaintenanceStatus.EM_ANDAMENTO;
    this.props.startedAt = startedAt ?? new Date();
    this.touch();
  }

  public finish(params: {
    odometerAtService: number;
    finishedAt?: Date;
    items?: MaintenanceItem[];
    currentVehicleKm?: number;
    cost?: Money | number;
  }): void {
    if (this.props.status !== MaintenanceStatus.EM_ANDAMENTO) {
      throw new MaintenanceNotInProgressException();
    }

    const finishedDate = params.finishedAt ?? new Date();
    if (this.props.startedAt && finishedDate < this.props.startedAt) {
      throw new InvalidMaintenanceDateException(
        'A data de término não pode ser anterior à data de início da manutenção.'
      );
    }

    if (
      params.currentVehicleKm !== undefined &&
      params.odometerAtService < params.currentVehicleKm
    ) {
      throw new InvalidOdometerReadingException(
        `O odômetro (${params.odometerAtService} km) não pode ser menor que o odômetro atual do veículo (${params.currentVehicleKm} km).`
      );
    }

    if (params.items && params.items.length > 0) {
      this.props.items = params.items;
      this.recalculateCost();
    } else if (params.cost !== undefined) {
      this.props.cost = params.cost instanceof Money ? params.cost : new Money(params.cost);
    }

    this.props.status = MaintenanceStatus.CONCLUIDA;
    this.props.odometerAtService = params.odometerAtService;
    this.props.finishedAt = finishedDate;
    this.touch();
  }

  public cancel(): void {
    if (
      this.props.status === MaintenanceStatus.CONCLUIDA ||
      this.props.status === MaintenanceStatus.CANCELADA
    ) {
      throw new MaintenanceAlreadyFinishedException();
    }

    this.props.status = MaintenanceStatus.CANCELADA;
    this.touch();
  }

  public updateDetails(params: {
    description?: string;
    serviceProvider?: string | null;
    scheduledDate?: Date | null;
    items?: MaintenanceItem[];
    type?: MaintenanceType;
    cost?: Money | number;
  }): void {
    if (
      this.props.status === MaintenanceStatus.CONCLUIDA ||
      this.props.status === MaintenanceStatus.CANCELADA
    ) {
      throw new MaintenanceAlreadyFinishedException();
    }

    if (params.description !== undefined) this.props.description = params.description;
    if (params.serviceProvider !== undefined) this.props.serviceProvider = params.serviceProvider;
    if (params.scheduledDate !== undefined) this.props.scheduledDate = params.scheduledDate;
    if (params.type !== undefined) this.props.type = params.type;

    if (params.items !== undefined) {
      this.props.items = params.items;
      this.recalculateCost();
    } else if (params.cost !== undefined) {
      this.props.cost = params.cost instanceof Money ? params.cost : new Money(params.cost);
    }

    this.touch();
  }

  public addItem(item: MaintenanceItem): void {
    if (
      this.props.status === MaintenanceStatus.CONCLUIDA ||
      this.props.status === MaintenanceStatus.CANCELADA
    ) {
      throw new MaintenanceAlreadyFinishedException();
    }

    this.props.items.push(item);
    this.recalculateCost();
    this.touch();
  }

  private recalculateCost(): void {
    if (this.props.items.length > 0) {
      this.props.cost = this.props.items.reduce(
        (acc, item) => acc.add(item.getTotal()),
        Money.zero()
      );
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  // --- Getters ---
  public getId(): string { return this.props.id; }
  public getVehicleId(): string { return this.props.vehicleId; }
  public getClientId(): string | undefined { return this.props.clientId; }
  public getOwnerId(): string { return this.props.ownerId; }
  public getType(): MaintenanceType { return this.props.type; }
  public getStatus(): MaintenanceStatus { return this.props.status; }
  public getDescription(): string { return this.props.description; }
  public getServiceProvider(): string | null | undefined { return this.props.serviceProvider; }
  public getScheduledDate(): Date | null | undefined { return this.props.scheduledDate; }
  public getStartedAt(): Date | null | undefined { return this.props.startedAt; }
  public getFinishedAt(): Date | null | undefined { return this.props.finishedAt; }
  public getOdometerAtService(): number | null | undefined { return this.props.odometerAtService; }
  public getCost(): Money { return this.props.cost; }
  public getItems(): MaintenanceItem[] { return [...this.props.items]; }
  public getCreatedAt(): Date { return this.props.createdAt; }
  public getUpdatedAt(): Date { return this.props.updatedAt; }
}
