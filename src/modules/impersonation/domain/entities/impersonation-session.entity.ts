import { randomUUID } from 'crypto';

export interface ImpersonationSessionProps {
  id: string;
  superAdminUserId: string;
  targetClientId: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}

export class ImpersonationSession {
  private props: ImpersonationSessionProps;

  constructor(props: ImpersonationSessionProps) {
    this.props = {
      ...props,
      endedAt: props.endedAt ?? null,
      ipAddress: props.ipAddress ?? null,
      userAgent: props.userAgent ?? null,
      createdAt: props.createdAt ?? new Date(),
    };
  }

  static create(params: {
    superAdminUserId: string;
    targetClientId: string;
    durationMinutes?: number;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): ImpersonationSession {
    const startedAt = new Date();
    const duration = params.durationMinutes ?? 45;
    const expiresAt = new Date(startedAt.getTime() + duration * 60 * 1000);

    return new ImpersonationSession({
      id: randomUUID(),
      superAdminUserId: params.superAdminUserId,
      targetClientId: params.targetClientId,
      startedAt,
      expiresAt,
      endedAt: null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      createdAt: startedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get superAdminUserId(): string {
    return this.props.superAdminUserId;
  }

  get targetClientId(): string {
    return this.props.targetClientId;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get endedAt(): Date | null | undefined {
    return this.props.endedAt;
  }

  get ipAddress(): string | null | undefined {
    return this.props.ipAddress;
  }

  get userAgent(): string | null | undefined {
    return this.props.userAgent;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  isActive(now: Date = new Date()): boolean {
    return !this.props.endedAt && !this.isExpired(now);
  }

  end(now: Date = new Date()): void {
    if (!this.props.endedAt) {
      this.props.endedAt = now;
    }
  }
}
