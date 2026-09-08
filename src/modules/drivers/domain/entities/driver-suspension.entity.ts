import { randomUUID } from 'node:crypto';
import { SuspensionReasonCategory } from './suspension-reason-category.enum';
import { SuspensionStatus } from './suspension-status.enum';
import { InvalidSuspensionReasonException } from '../exceptions/invalid-suspension-reason.exception';
import { InvalidSuspensionDateRangeException } from '../exceptions/invalid-suspension-date-range.exception';
import { SuspensionAlreadyLiftedException } from '../exceptions/suspension-already-lifted.exception';

export { SuspensionReasonCategory, SuspensionStatus };

export interface DriverSuspensionProps {
  driverId: string;
  clientId?: string;
  ownerId: string;
  reasonCategory: SuspensionReasonCategory;
  reasonDetails?: string | null;
  suspendedBy: string;
  suspendedAt: Date;
  expectedReturnDate?: Date | null;
  indefinite: boolean;
  attachmentUrl?: string | null;
  liftedAt?: Date | null;
  liftedBy?: string | null;
  liftReason?: string | null;
  status: SuspensionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverSuspensionProps {
  driverId: string;
  clientId?: string;
  ownerId: string;
  reasonCategory: SuspensionReasonCategory;
  reasonDetails?: string | null;
  suspendedBy: string;
  suspendedAt?: Date;
  expectedReturnDate?: Date | null;
  indefinite?: boolean;
  attachmentUrl?: string | null;
  liftedAt?: Date | null;
  liftedBy?: string | null;
  liftReason?: string | null;
  status?: SuspensionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DriverSuspension {
  private readonly id: string;
  private props: DriverSuspensionProps;

  constructor(props: CreateDriverSuspensionProps, id?: string) {
    this.id = id ?? randomUUID();

    const indefinite = props.indefinite ?? false;
    let expectedReturnDate = props.expectedReturnDate ?? null;

    // Regra: se OUTRO, reasonDetails é obrigatório
    if (
      props.reasonCategory === SuspensionReasonCategory.OUTRO &&
      (!props.reasonDetails || props.reasonDetails.trim().length === 0)
    ) {
      throw new InvalidSuspensionReasonException(
        'Para a categoria OUTRO, o preenchimento dos detalhes da justificativa é obrigatório.',
      );
    }

    // Regra: se indefinite = true, expectedReturnDate deve ser null
    if (indefinite && expectedReturnDate !== null) {
      throw new InvalidSuspensionDateRangeException(
        'Suspensões por tempo indeterminado não podem conter data de retorno definida.',
      );
    }

    // Regra: se indefinite = false e status inicial ATIVA, expectedReturnDate deve ser informado
    if (!indefinite && !expectedReturnDate && (props.status ?? SuspensionStatus.ATIVA) === SuspensionStatus.ATIVA) {
      throw new InvalidSuspensionDateRangeException(
        'Informe a data prevista de retorno ou marque a opção por tempo indeterminado.',
      );
    }

    const suspendedAt = props.suspendedAt ?? new Date();

    if (props.liftedAt && props.liftedAt < suspendedAt) {
      throw new InvalidSuspensionDateRangeException(
        'A data de encerramento da suspensão não pode ser anterior à data de suspensão.',
      );
    }

    this.props = {
      driverId: props.driverId,
      clientId: props.clientId,
      ownerId: props.ownerId,
      reasonCategory: props.reasonCategory,
      reasonDetails: props.reasonDetails ?? null,
      suspendedBy: props.suspendedBy,
      suspendedAt,
      expectedReturnDate,
      indefinite,
      attachmentUrl: props.attachmentUrl ?? null,
      liftedAt: props.liftedAt ?? null,
      liftedBy: props.liftedBy ?? null,
      liftReason: props.liftReason ?? null,
      status: props.status ?? SuspensionStatus.ATIVA,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  public getId(): string {
    return this.id;
  }

  public getDriverId(): string {
    return this.props.driverId;
  }

  public getClientId(): string | undefined {
    return this.props.clientId;
  }

  public getOwnerId(): string {
    return this.props.ownerId;
  }

  public getReasonCategory(): SuspensionReasonCategory {
    return this.props.reasonCategory;
  }

  public getReasonDetails(): string | null {
    return this.props.reasonDetails ?? null;
  }

  public getSuspendedBy(): string {
    return this.props.suspendedBy;
  }

  public getSuspendedAt(): Date {
    return this.props.suspendedAt;
  }

  public getExpectedReturnDate(): Date | null {
    return this.props.expectedReturnDate ?? null;
  }

  public isIndefinite(): boolean {
    return this.props.indefinite;
  }

  public getAttachmentUrl(): string | null {
    return this.props.attachmentUrl ?? null;
  }

  public getLiftedAt(): Date | null {
    return this.props.liftedAt ?? null;
  }

  public getLiftedBy(): string | null {
    return this.props.liftedBy ?? null;
  }

  public getLiftReason(): string | null {
    return this.props.liftReason ?? null;
  }

  public getStatus(): SuspensionStatus {
    return this.props.status;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  public isActive(): boolean {
    return this.props.status === SuspensionStatus.ATIVA;
  }

  public lift(params: {
    liftedBy: string;
    liftReason?: string | null;
    liftedAt?: Date;
  }): void {
    if (this.props.status === SuspensionStatus.ENCERRADA) {
      throw new SuspensionAlreadyLiftedException(this.id);
    }

    const liftedAt = params.liftedAt ?? new Date();

    if (liftedAt < this.props.suspendedAt) {
      throw new InvalidSuspensionDateRangeException(
        'A data de encerramento da suspensão não pode ser anterior à data de suspensão.',
      );
    }

    this.props.status = SuspensionStatus.ENCERRADA;
    this.props.liftedAt = liftedAt;
    this.props.liftedBy = params.liftedBy;
    this.props.liftReason = params.liftReason ?? null;
    this.props.updatedAt = new Date();
  }
}
