import { randomUUID } from 'crypto';

export interface AuditLogProps {
  id: string;
  impersonationSessionId?: string | null;
  actorUserId: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export class AuditLog {
  private props: AuditLogProps;

  constructor(props: AuditLogProps) {
    this.props = {
      ...props,
      impersonationSessionId: props.impersonationSessionId ?? null,
      resourceType: props.resourceType ?? null,
      resourceId: props.resourceId ?? null,
      metadata: props.metadata ?? null,
      createdAt: props.createdAt ?? new Date(),
    };
  }

  static create(params: {
    impersonationSessionId?: string | null;
    actorUserId: string;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, any> | null;
  }): AuditLog {
    return new AuditLog({
      id: randomUUID(),
      impersonationSessionId: params.impersonationSessionId ?? null,
      actorUserId: params.actorUserId,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ?? null,
      createdAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get impersonationSessionId(): string | null | undefined {
    return this.props.impersonationSessionId;
  }

  get actorUserId(): string {
    return this.props.actorUserId;
  }

  get action(): string {
    return this.props.action;
  }

  get resourceType(): string | null | undefined {
    return this.props.resourceType;
  }

  get resourceId(): string | null | undefined {
    return this.props.resourceId;
  }

  get metadata(): Record<string, any> | null | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
}
