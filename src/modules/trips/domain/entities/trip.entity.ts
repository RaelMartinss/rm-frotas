import { randomUUID } from 'node:crypto';
import { Location } from '../value-objects/location.vo';
import { TripStatus } from './trip-status.enum';
import { InvalidTripStatusTransitionException } from '../exceptions/invalid-trip-status-transition.exception';

export interface TripProps {
  driverId: string;
  vehicleId: string;
  origin: Location;
  destination: Location;
  status: TripStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTripProps {
  driverId: string;
  vehicleId: string;
  origin: Location;
  destination: Location;
  status?: TripStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Trip {
  private readonly id: string;
  private props: TripProps;

  constructor(props: CreateTripProps, id?: string) {
    this.id = id ?? randomUUID();
    this.props = {
      ...props,
      status: props.status ?? TripStatus.PLANNED,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  public getId(): string { return this.id; }
  public getDriverId(): string { return this.props.driverId; }
  public getVehicleId(): string { return this.props.vehicleId; }
  public getOrigin(): Location { return this.props.origin; }
  public getDestination(): Location { return this.props.destination; }
  public getStatus(): TripStatus { return this.props.status; }
  public getStartedAt(): Date | null | undefined { return this.props.startedAt; }
  public getCompletedAt(): Date | null | undefined { return this.props.completedAt; }
  public getCreatedAt(): Date { return this.props.createdAt; }
  public getUpdatedAt(): Date { return this.props.updatedAt; }

  public start(): void {
    if (this.props.status !== TripStatus.PLANNED) {
      throw new InvalidTripStatusTransitionException(
        this.props.status,
        TripStatus.IN_PROGRESS,
      );
    }

    this.props.status = TripStatus.IN_PROGRESS;
    this.props.startedAt = new Date();
    this.touch();
  }

  public complete(): void {
    if (this.props.status !== TripStatus.IN_PROGRESS) {
      throw new InvalidTripStatusTransitionException(
        this.props.status,
        TripStatus.COMPLETED,
      );
    }

    this.props.status = TripStatus.COMPLETED;
    this.props.completedAt = new Date();
    this.touch();
  }

  public cancel(): void {
    if (this.props.status === TripStatus.COMPLETED) {
      throw new InvalidTripStatusTransitionException(
        this.props.status,
        TripStatus.CANCELLED,
      );
    }

    this.props.status = TripStatus.CANCELLED;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}