import { Injectable } from '@nestjs/common';
import { IImpersonationSessionsRepository } from '../../domain/repositories/impersonation-sessions.repository.interface';
import { IAuditLogsRepository } from '../../domain/repositories/audit-logs.repository.interface';
import { AuditLog } from '../../domain/entities/audit-log.entity';

@Injectable()
export class ExpireImpersonationSessionsUseCase {
  constructor(
    private readonly sessionsRepository: IImpersonationSessionsRepository,
    private readonly auditLogsRepository: IAuditLogsRepository,
  ) {}

  async execute(): Promise<number> {
    const now = new Date();
    const expiredSessions = await this.sessionsRepository.findExpiredUnended(now);

    for (const session of expiredSessions) {
      session.end(session.expiresAt);
      await this.sessionsRepository.update(session);

      const expiredLog = AuditLog.create({
        impersonationSessionId: session.id,
        actorUserId: session.superAdminUserId,
        action: 'IMPERSONATION_EXPIRED',
        resourceType: 'Client',
        resourceId: session.targetClientId,
        metadata: {
          reason: 'TTL_EXPIRED_45MIN',
        },
      });
      await this.auditLogsRepository.save(expiredLog);
    }

    return expiredSessions.length;
  }
}
