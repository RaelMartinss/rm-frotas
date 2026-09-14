import { AuditLog as PrismaAuditLog } from '@prisma/client';
import { AuditLog } from '../../../../domain/entities/audit-log.entity';

export class PrismaAuditLogMapper {
  static toDomain(raw: PrismaAuditLog): AuditLog {
    return new AuditLog({
      id: raw.id,
      impersonationSessionId: raw.impersonationSessionId,
      actorUserId: raw.actorUserId,
      action: raw.action,
      resourceType: raw.resourceType,
      resourceId: raw.resourceId,
      metadata: raw.metadata as Record<string, any> | null,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(log: AuditLog) {
    return {
      id: log.id,
      impersonationSessionId: log.impersonationSessionId ?? null,
      actorUserId: log.actorUserId,
      action: log.action,
      resourceType: log.resourceType ?? null,
      resourceId: log.resourceId ?? null,
      metadata: log.metadata ?? undefined,
      createdAt: log.createdAt ?? new Date(),
    };
  }
}
