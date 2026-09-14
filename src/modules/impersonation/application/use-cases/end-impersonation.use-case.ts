import { Injectable } from '@nestjs/common';
import { IImpersonationSessionsRepository } from '../../domain/repositories/impersonation-sessions.repository.interface';
import { IAuditLogsRepository } from '../../domain/repositories/audit-logs.repository.interface';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { EndImpersonationInput } from '../dtos/impersonation.dtos';
import { ImpersonationSessionNotFoundException } from '../../domain/exceptions/impersonation.exceptions';

@Injectable()
export class EndImpersonationUseCase {
  constructor(
    private readonly sessionsRepository: IImpersonationSessionsRepository,
    private readonly auditLogsRepository: IAuditLogsRepository,
  ) {}

  async execute(input: EndImpersonationInput): Promise<{ success: boolean; endedAt: string }> {
    const { superAdminUserId, impersonationSessionId, reason } = input;

    let session = impersonationSessionId
      ? await this.sessionsRepository.findById(impersonationSessionId)
      : null;

    if (!session) {
      const activeWithClient = await this.sessionsRepository.findActiveBySuperAdminId(superAdminUserId);
      session = activeWithClient?.session ?? null;
    }

    if (!session) {
      // Se não há sessão aberta, retorna sucesso idempotente
      return {
        success: true,
        endedAt: new Date().toISOString(),
      };
    }

    if (session.superAdminUserId !== superAdminUserId) {
      throw new ImpersonationSessionNotFoundException();
    }

    const now = new Date();
    session.end(now);
    await this.sessionsRepository.update(session);

    const endLog = AuditLog.create({
      impersonationSessionId: session.id,
      actorUserId: superAdminUserId,
      action: 'IMPERSONATION_END',
      resourceType: 'Client',
      resourceId: session.targetClientId,
      metadata: {
        reason: reason || 'MANUAL_LOGOUT',
      },
    });
    await this.auditLogsRepository.save(endLog);

    return {
      success: true,
      endedAt: now.toISOString(),
    };
  }
}
