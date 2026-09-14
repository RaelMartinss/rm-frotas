import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { StartImpersonationUseCase } from '../start-impersonation.use-case';
import { EndImpersonationUseCase } from '../end-impersonation.use-case';
import { GetActiveImpersonationUseCase } from '../get-active-impersonation.use-case';
import { ExpireImpersonationSessionsUseCase } from '../expire-impersonation-sessions.use-case';
import { ImpersonationScopeGuard } from '../../../infrastructure/http/guards/impersonation-scope.guard';
import {
  InMemoryImpersonationSessionsRepository,
  InMemoryAuditLogsRepository,
} from '../../../repositories/in-memory-impersonation.repository';
import { InMemoryUsersRepository } from '../../../../auth/repositories/in-memory-users.repository';
import { InMemoryClientsRepository } from '../../../../clients/repositories/in-memory-clients.repository';
import { User, UserRole } from '../../../../auth/domain/entities/user.entity';
import { Email } from '../../../../auth/domain/value-objects/email.vo';
import { Password } from '../../../../auth/domain/value-objects/password.vo';
import { Client } from '../../../../clients/domain/entities/client.entity';
import { ClientDocument } from '../../../../clients/domain/value-objects/document.vo';
import { ClientStatus } from '../../../../clients/domain/enums/client-status.enum';
import { ImpersonationSession } from '../../../domain/entities/impersonation-session.entity';
import {
  ClientCancelledImpersonationException,
  UnauthorizedImpersonationException,
} from '../../../domain/exceptions/impersonation.exceptions';
import { ClientNotFoundException } from '../../../../clients/domain/exceptions/client.exceptions';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('Impersonation Use Cases & Guard', () => {
  let usersRepository: InMemoryUsersRepository;
  let clientsRepository: InMemoryClientsRepository;
  let sessionsRepository: InMemoryImpersonationSessionsRepository;
  let auditLogsRepository: InMemoryAuditLogsRepository;
  let jwtService: JwtService;

  let startUseCase: StartImpersonationUseCase;
  let endUseCase: EndImpersonationUseCase;
  let getActiveUseCase: GetActiveImpersonationUseCase;
  let expireUseCase: ExpireImpersonationSessionsUseCase;
  let guard: ImpersonationScopeGuard;

  let superAdmin: User;
  let fleetManager: User;
  let activeClient: Client;
  let canceledClient: Client;

  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository();
    clientsRepository = new InMemoryClientsRepository();
    sessionsRepository = new InMemoryImpersonationSessionsRepository(clientsRepository);
    auditLogsRepository = new InMemoryAuditLogsRepository();

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mocked-support-jwt-token'),
    } as unknown as JwtService;

    startUseCase = new StartImpersonationUseCase(
      usersRepository,
      clientsRepository,
      sessionsRepository,
      auditLogsRepository,
      jwtService,
    );

    endUseCase = new EndImpersonationUseCase(sessionsRepository, auditLogsRepository);
    getActiveUseCase = new GetActiveImpersonationUseCase(sessionsRepository);
    expireUseCase = new ExpireImpersonationSessionsUseCase(sessionsRepository, auditLogsRepository);
    guard = new ImpersonationScopeGuard(sessionsRepository);

    // Setup entities
    const hash = await Password.create('Password123!');

    superAdmin = new User(
      {
        name: 'Super Admin',
        email: new Email('superadmin@rmfrotas.com'),
        password: hash,
        role: UserRole.SUPER_ADMIN,
      },
      'admin-id-1',
    );
    await usersRepository.save(superAdmin);

    fleetManager = new User(
      {
        name: 'Fleet Manager',
        email: new Email('manager@client.com'),
        password: hash,
        role: UserRole.FLEET_MANAGER,
        clientId: 'client-1',
      },
      'manager-id-1',
    );
    await usersRepository.save(fleetManager);

    activeClient = new Client(
      {
        legalName: 'Transportes Brasil Ltda',
        tradeName: 'Brasil Express',
        document: new ClientDocument('12.345.678/0001-95'),
        billingEmail: 'contato@brasilexpress.com',
        status: ClientStatus.ATIVO,
      },
      'client-1',
    );
    await clientsRepository.create(activeClient);

    canceledClient = new Client(
      {
        legalName: 'Cancelada Transportes S/A',
        tradeName: 'Cancelada Express',
        document: new ClientDocument('00.000.000/0001-91'),
        billingEmail: 'financeiro@cancelada.com',
        status: ClientStatus.CANCELADO,
      },
      'client-cancelled-id',
    );
    await clientsRepository.create(canceledClient);
  });

  describe('StartImpersonationUseCase', () => {
    it('deve iniciar sessão de suporte de 45 minutos com sucesso e registrar audit log', async () => {
      const result = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test',
      });

      expect(result.accessToken).toBe('mocked-support-jwt-token');
      expect(result.session.targetClientId).toBe(activeClient.getId());
      expect(result.session.scope).toBe('READ_ONLY');
      expect(result.session.remainingSeconds).toBeGreaterThan(0);

      // Verifica sessão persistida
      expect(sessionsRepository.items).toHaveLength(1);
      const savedSession = sessionsRepository.items[0];
      expect(savedSession.superAdminUserId).toBe(superAdmin.getId());
      expect(savedSession.targetClientId).toBe(activeClient.getId());
      expect(savedSession.isActive()).toBe(true);

      // Verifica log de auditoria
      expect(auditLogsRepository.items).toHaveLength(1);
      expect(auditLogsRepository.items[0].action).toBe('IMPERSONATION_START');
      expect(auditLogsRepository.items[0].actorUserId).toBe(superAdmin.getId());
      expect(auditLogsRepository.items[0].resourceId).toBe(activeClient.getId());
    });

    it('deve encerrar sessão anterior antes de abrir nova sessão para o mesmo SUPER_ADMIN', async () => {
      // Cria primeira sessão
      await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      expect(sessionsRepository.items).toHaveLength(1);
      const firstSessionId = sessionsRepository.items[0].id;

      // Inicia segunda sessão para outro cliente
      const anotherClient = new Client(
        {
          legalName: 'Outra Empresa Ltda',
          tradeName: 'Outra Express',
          document: new ClientDocument('33.000.167/0001-01'),
          billingEmail: 'contato@outra.com',
          status: ClientStatus.ATIVO,
        },
        'client-2',
      );
      await clientsRepository.create(anotherClient);

      await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: anotherClient.getId(),
        ipAddress: '127.0.0.1',
      });

      expect(sessionsRepository.items).toHaveLength(2);
      const firstSession = await sessionsRepository.findById(firstSessionId);
      expect(firstSession?.isActive()).toBe(false);
      expect(firstSession?.endedAt).not.toBeNull();

      // Deve haver 3 logs: START, END (superseded), START
      expect(auditLogsRepository.items).toHaveLength(3);
      expect(auditLogsRepository.items[1].action).toBe('IMPERSONATION_END');
    });

    it('não deve permitir impersonation iniciada por usuário não SUPER_ADMIN', async () => {
      await expect(
        startUseCase.execute({
          superAdminUserId: fleetManager.getId(),
          targetClientId: activeClient.getId(),
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toThrow(UnauthorizedImpersonationException);
    });

    it('não deve permitir impersonation de cliente inexistente', async () => {
      await expect(
        startUseCase.execute({
          superAdminUserId: superAdmin.getId(),
          targetClientId: 'non-existent-client',
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toThrow(ClientNotFoundException);
    });

    it('não deve permitir impersonation de cliente com status CANCELADO', async () => {
      await expect(
        startUseCase.execute({
          superAdminUserId: superAdmin.getId(),
          targetClientId: canceledClient.getId(),
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toThrow(ClientCancelledImpersonationException);
    });
  });

  describe('EndImpersonationUseCase', () => {
    it('deve encerrar sessão ativa e gravar log IMPERSONATION_END', async () => {
      const started = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      const endResult = await endUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        impersonationSessionId: started.session.id,
      });

      expect(endResult.success).toBe(true);

      const session = await sessionsRepository.findById(started.session.id);
      expect(session?.isActive()).toBe(false);
      expect(session?.endedAt).not.toBeNull();

      const endLog = auditLogsRepository.items.find((l) => l.action === 'IMPERSONATION_END');
      expect(endLog).toBeDefined();
      expect(endLog?.actorUserId).toBe(superAdmin.getId());
    });

    it('deve ser idempotente quando não há sessão ativa para encerrar', async () => {
      const endResult = await endUseCase.execute({
        superAdminUserId: superAdmin.getId(),
      });

      expect(endResult.success).toBe(true);
    });
  });

  describe('GetActiveImpersonationUseCase', () => {
    it('deve retornar dados e remainingSeconds da sessão ativa', async () => {
      await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      const active = await getActiveUseCase.execute(superAdmin.getId());
      expect(active.active).toBe(true);
      expect(active.session?.targetClientId).toBe(activeClient.getId());
      expect(active.session?.targetClientName).toBe('Brasil Express');
      expect(active.session?.remainingSeconds).toBeGreaterThan(2600); // 45 min = 2700s
    });

    it('deve retornar active: false se nenhuma sessão foi iniciada', async () => {
      const active = await getActiveUseCase.execute(superAdmin.getId());
      expect(active.active).toBe(false);
      expect(active.session).toBeNull();
    });
  });

  describe('ExpireImpersonationSessionsUseCase', () => {
    it('deve encerrar sessões expiradas pelo tempo e gravar log', async () => {
      const started = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      const session = await sessionsRepository.findById(started.session.id);
      // Simula passagem de 50 minutos
      const past = new Date(Date.now() - 50 * 60 * 1000);
      const pastSession = new ImpersonationSession({
        id: started.session.id,
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        startedAt: new Date(past.getTime() - 45 * 60 * 1000),
        expiresAt: past,
      });
      await sessionsRepository.update(pastSession);

      const count = await expireUseCase.execute();
      expect(count).toBe(1);

      const expiredSession = await sessionsRepository.findById(started.session.id);
      expect(expiredSession?.endedAt).not.toBeNull();

      const expiredLog = auditLogsRepository.items.find((l) => l.action === 'IMPERSONATION_EXPIRED');
      expect(expiredLog).toBeDefined();
    });
  });

  describe('ImpersonationScopeGuard', () => {
    it('deve permitir requisições comuns de usuários não-impersonando', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'normal-user', role: UserRole.FLEET_MANAGER },
            method: 'POST',
            url: '/vehicles',
          }),
        }),
      } as any;

      expect(await guard.canActivate(context)).toBe(true);
    });

    it('deve permitir GET quando impersonando e definir user.clientId com targetClientId', async () => {
      const started = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      const reqUser: any = {
        userId: superAdmin.getId(),
        role: UserRole.SUPER_ADMIN,
        impersonating: true,
        impersonationSessionId: started.session.id,
        targetClientId: activeClient.getId(),
        scope: 'READ_ONLY',
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: reqUser,
            method: 'GET',
            url: '/vehicles',
            query: {},
          }),
        }),
      } as any;

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
      expect(reqUser.clientId).toBe(activeClient.getId());
    });

    it('deve bloquear operações de escrita (POST, PUT, DELETE) com ForbiddenException em modo READ_ONLY', async () => {
      const started = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      const reqUser: any = {
        userId: superAdmin.getId(),
        role: UserRole.SUPER_ADMIN,
        impersonating: true,
        impersonationSessionId: started.session.id,
        targetClientId: activeClient.getId(),
        scope: 'READ_ONLY',
      };

      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      for (const method of methods) {
        const context = {
          switchToHttp: () => ({
            getRequest: () => ({
              user: reqUser,
              method,
              url: '/vehicles',
            }),
          }),
        } as any;

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      }
    });

    it('deve permitir POST /support/impersonate/end mesmo em modo suporte', async () => {
      const started = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      const reqUser: any = {
        userId: superAdmin.getId(),
        role: UserRole.SUPER_ADMIN,
        impersonating: true,
        impersonationSessionId: started.session.id,
        targetClientId: activeClient.getId(),
        scope: 'READ_ONLY',
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: reqUser,
            method: 'POST',
            url: '/v1/support/impersonate/end',
          }),
        }),
      } as any;

      expect(await guard.canActivate(context)).toBe(true);
    });

    it('deve lançar UnauthorizedException se a sessão de suporte estiver expirada ou encerrada', async () => {
      const started = await startUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        targetClientId: activeClient.getId(),
        ipAddress: '127.0.0.1',
      });

      // Encerra sessão
      await endUseCase.execute({
        superAdminUserId: superAdmin.getId(),
        impersonationSessionId: started.session.id,
      });

      const reqUser: any = {
        userId: superAdmin.getId(),
        role: UserRole.SUPER_ADMIN,
        impersonating: true,
        impersonationSessionId: started.session.id,
        targetClientId: activeClient.getId(),
        scope: 'READ_ONLY',
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: reqUser,
            method: 'GET',
            url: '/vehicles',
          }),
        }),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
