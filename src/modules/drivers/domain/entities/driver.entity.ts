import { Cpf } from '../value-objects/cpf.vo';
import { Cnh } from '../value-objects/cnh.vo';
import { DriverStatus } from './driver-status.enum';
import { InvalidDriverStatusTransitionException } from '../exceptions/invalid-driver-status-transition.exception';
import { randomUUID } from 'node:crypto';

export { DriverStatus };

export interface DriverProps {
  name: string;
  cpf: Cpf;
  cnh: Cnh;
  status: DriverStatus;
  cnhExpirationDate: Date;
  clientId?: string;
  ownerId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverProps {
  name: string;
  cpf: Cpf;
  cnh: Cnh;
  cnhExpirationDate?: Date;
  status?: DriverStatus;
  clientId?: string;
  ownerId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Driver {
  private readonly id: string;
  private props: DriverProps;

  constructor(props: CreateDriverProps, id?: string) {
    const cnhExpirationDate =
      props.cnhExpirationDate ?? props.cnh.getExpirationDate();

    this.id = id ?? randomUUID();
    this.props = {
      ...props,
      cnhExpirationDate,
      status: props.status ?? DriverStatus.ACTIVE,
      clientId: props.clientId,
      ownerId: props.ownerId,
      userId: props.userId,
      email: props.email,
      phone: props.phone,
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
  public getClientId(): string | undefined {
    return this.props.clientId;
  }
  public getOwnerId(): string | undefined {
    return this.props.ownerId;
  }
  public getUserId(): string | undefined {
    return this.props.userId;
  }
  public setUserId(userId: string): void {
    this.props.userId = userId;
    this.touch();
  }
  public getEmail(): string | undefined {
    return this.props.email;
  }
  public setEmail(email?: string): void {
    this.props.email = email;
    this.touch();
  }
  public getPhone(): string | undefined {
    return this.props.phone;
  }
  public setPhone(phone?: string): void {
    this.props.phone = phone;
    this.touch();
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

  public getCnhExpirationDate(): Date {
    return new Date(
      this.props.cnhExpirationDate ?? this.props.cnh.getExpirationDate(),
    );
  }

  /**
   * Retorna os dias restantes para o vencimento da CNH (positivo = no prazo, 0 = vence hoje, negativo = vencida).
   * Normalizado por data civil local.
   */
  public getDaysUntilCnhExpires(referenceDate: Date = new Date()): number {
    const expirationDate = this.getCnhExpirationDate();

    const ref = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );
    const exp = new Date(
      expirationDate.getFullYear(),
      expirationDate.getMonth(),
      expirationDate.getDate(),
    );

    const diffMs = exp.getTime() - ref.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se a CNH do motorista está vencida em relação à data informada (ou data atual)
   */
  public isCnhExpired(referenceDate: Date = new Date()): boolean {
    return this.getDaysUntilCnhExpires(referenceDate) < 0;
  }

  /**
   * Verifica se a CNH está vencida ou com vencimento iminente (<= thresholdDays, default 1 dia)
   */
  public isCnhInvalidOrExpiringSoon(
    referenceDate: Date = new Date(),
    thresholdDays: number = 1,
  ): boolean {
    return this.getDaysUntilCnhExpires(referenceDate) <= thresholdDays;
  }
}
