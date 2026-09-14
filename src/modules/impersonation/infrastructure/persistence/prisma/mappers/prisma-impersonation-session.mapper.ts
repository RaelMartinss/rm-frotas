import { ImpersonationSession as PrismaSession } from '@prisma/client';
import { ImpersonationSession } from '../../../../domain/entities/impersonation-session.entity';

export class PrismaImpersonationSessionMapper {
  static toDomain(raw: PrismaSession): ImpersonationSession {
    return new ImpersonationSession({
      id: raw.id,
      superAdminUserId: raw.superAdminUserId,
      targetClientId: raw.targetClientId,
      startedAt: raw.startedAt,
      expiresAt: raw.expiresAt,
      endedAt: raw.endedAt,
      ipAddress: raw.ipAddress,
      userAgent: raw.userAgent,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(session: ImpersonationSession) {
    return {
      id: session.id,
      superAdminUserId: session.superAdminUserId,
      targetClientId: session.targetClientId,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      endedAt: session.endedAt ?? null,
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
      createdAt: session.createdAt ?? new Date(),
    };
  }
}
