import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IUsersRepository } from '../../../auth/domain/repositories/users.repository.interface';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { IClientsRepository } from '../../../clients/domain/repositories/clients.repository.interface';
import { ClientStatus } from '../../../clients/domain/enums/client-status.enum';
import { ClientNotFoundException } from '../../../clients/domain/exceptions/client.exceptions';
import { IImpersonationSessionsRepository } from '../../domain/repositories/impersonation-sessions.repository.interface';
import { IAuditLogsRepository } from '../../domain/repositories/audit-logs.repository.interface';
import { ImpersonationSession } from '../../domain/entities/impersonation-session.entity';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import {
  ClientCancelledImpersonationException,
  UnauthorizedImpersonationException,
} from '../../domain/exceptions/impersonation.exceptions';
import {
  StartImpersonationInput,
  StartImpersonationOutput,
} from '../dtos/impersonation.dtos';

@Injectable()
export class StartImpersonationUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly clientsRepository: IClientsRepository,
    private readonly sessionsRepository: IImpersonationSessionsRepository,
    private readonly auditLogsRepository: IAuditLogsRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: StartImpersonationInput): Promise<StartImpersonationOutput> {
    const { superAdminUserId, targetClientId, ipAddress, userAgent } = input;

    const user = await this.usersRepository.findById(superAdminUserId);
    if (!user || user.getRole() !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedImpersonationException();
    }

    const client = await this.clientsRepository.findById(targetClientId);
    if (!client) {
      throw new ClientNotFoundException();
    }

    if (client.getStatus() === ClientStatus.CANCELADO) {
      throw new ClientCancelledImpersonationException();
    }

    // Encerra sessão anterior ativa do SUPER_ADMIN se houver
    const previousActive = await this.sessionsRepository.findActiveBySuperAdminId(superAdminUserId);
    if (previousActive && previousActive.session.isActive()) {
      previousActive.session.end();
      await this.sessionsRepository.update(previousActive.session);

      const endLog = AuditLog.create({
        impersonationSessionId: previousActive.session.id,
        actorUserId: superAdminUserId,
        action: 'IMPERSONATION_END',
        resourceType: 'Client',
        resourceId: previousActive.session.targetClientId,
        metadata: {
          reason: 'SUPERSEDED_BY_NEW_SESSION',
          supersededByClientId: targetClientId,
        },
      });
      await this.auditLogsRepository.save(endLog);
    }

    // Cria nova sessão de impersonation (45 minutos)
    const session = ImpersonationSession.create({
      superAdminUserId,
      targetClientId,
      durationMinutes: 45,
      ipAddress,
      userAgent,
    });
    await this.sessionsRepository.save(session);

    // Registra log de início no AuditLog
    const startLog = AuditLog.create({
      impersonationSessionId: session.id,
      actorUserId: superAdminUserId,
      action: 'IMPERSONATION_START',
      resourceType: 'Client',
      resourceId: targetClientId,
      metadata: {
        clientName: client.getTradeName(),
        clientDocument: client.getDocument().getValue(),
        ipAddress,
        userAgent,
      },
    });
    await this.auditLogsRepository.save(startLog);

    // Gera token JWT de impersonation curto (45m)
    const payload = {
      sub: superAdminUserId,
      email: user.getEmail().getValue(),
      role: UserRole.SUPER_ADMIN,
      impersonating: true,
      impersonationSessionId: session.id,
      targetClientId: targetClientId,
      scope: 'READ_ONLY',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '45m',
    });

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      accessToken,
      session: {
        id: session.id,
        targetClientId: client.getId(),
        targetClientName: client.getTradeName(),
        targetClientDocument: client.getDocument().getValue(),
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        scope: 'READ_ONLY',
        remainingSeconds,
      },
    };
  }
}
