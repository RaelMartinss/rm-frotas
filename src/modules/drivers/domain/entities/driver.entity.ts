import { Cpf } from '../value-objects/cpf.vo';
import { Cnh } from '../value-objects/cnh.vo';
import { DriverStatus } from './driver-status.enum';
import { InvalidDriverStatusTransitionException } from '../exceptions/invalid-driver-status-transition.exception';
import { randomUUID } from 'node:crypto';

export interface DriverProps {
  name: string;
  cpf: Cpf;
  cnh: Cnh;
  status: DriverStatus;
  cnhExpirationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverProps {
  name: string;
  cpf: Cpf;
  cnh: Cnh;
  cnhExpirationDate: Date;
  status?: DriverStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Driver {
  private readonly id: string;
  private props: DriverProps;

  constructor(props: CreateDriverProps, id?: string) {
    this.id = id ?? randomUUID();
    this.props = {
      ...props,
      status: props.status ?? DriverStatus.ACTIVE,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  public getId(): string {
    return this.id;
  }
  public getName(): string {
    return this.props.name;
  }
  public getCpf(): Cpf {
    return this.props.cpf;
  }
  public getCnh(): Cnh {
    return this.props.cnh;
  }
  public getStatus(): DriverStatus {
    return this.props.status;
  }
  public getCreatedAt(): Date {
    return this.props.createdAt;
  }
  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  public activate(): void {
    if (this.props.status === DriverStatus.ACTIVE) {
      throw new InvalidDriverStatusTransitionException(
        this.props.status,

        DriverStatus.ACTIVE,
      );
    }

    this.props.status = DriverStatus.ACTIVE;
    this.touch();
  }

  public deactivate(): void {
    if (this.props.status === DriverStatus.INACTIVE) {
      throw new InvalidDriverStatusTransitionException(
        this.props.status,
        DriverStatus.INACTIVE,
      );
    }
    this.props.status = DriverStatus.INACTIVE;
    this.touch();
  }

  public suspend(): void {
    if (this.props.status === DriverStatus.INACTIVE) {
      throw new InvalidDriverStatusTransitionException(
        DriverStatus.INACTIVE,
        DriverStatus.SUSPENDED,
      );
    }

    if (this.props.status === DriverStatus.SUSPENDED) {
      throw new InvalidDriverStatusTransitionException(
        DriverStatus.SUSPENDED,
        DriverStatus.SUSPENDED,
      );
    }

    this.props.status = DriverStatus.SUSPENDED;
    this.touch();
  }

  public updateCnh(newCnh: Cnh): void {
    this.props.cnh = newCnh;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  /**
   * Verifica se a CNH do motorista está vencida em relação à data informada (ou data atual)
   */
  public isCnhExpired(referenceDate: Date = new Date()): boolean {
    if (!this.props.cnhExpirationDate) {
      return false;
    }

    // Normaliza para comparar apenas a data sem interferência de fuso/horário
    const expiration = new Date(this.props.cnhExpirationDate);
    expiration.setHours(23, 59, 59, 999);

    return referenceDate > expiration;
  }
}
