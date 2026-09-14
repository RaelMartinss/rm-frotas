import { Injectable } from '@nestjs/common';
import { IImpersonationSessionsRepository } from '../../domain/repositories/impersonation-sessions.repository.interface';
import { ActiveImpersonationOutput } from '../dtos/impersonation.dtos';

@Injectable()
export class GetActiveImpersonationUseCase {
  constructor(
    private readonly sessionsRepository: IImpersonationSessionsRepository,
  ) {}

  async execute(superAdminUserId: string): Promise<ActiveImpersonationOutput> {
    const activeWithClient = await this.sessionsRepository.findActiveBySuperAdminId(superAdminUserId);

    if (!activeWithClient) {
      return {
        active: false,
        session: null,
      };
    }

    const { session, targetClient } = activeWithClient;
    const now = new Date();

    if (session.isExpired(now)) {
      session.end(session.expiresAt);
      await this.sessionsRepository.update(session);
      return {
        active: false,
        session: null,
      };
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      active: true,
      session: {
        id: session.id,
        targetClientId: targetClient.id,
        targetClientName: targetClient.tradeName,
        targetClientDocument: targetClient.document,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        scope: 'READ_ONLY',
        remainingSeconds,
      },
    };
  }
}
