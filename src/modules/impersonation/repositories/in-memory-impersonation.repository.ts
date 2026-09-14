import {
  IImpersonationSessionsRepository,
  ImpersonationSessionWithClient,
} from '../domain/repositories/impersonation-sessions.repository.interface';
import {
  FindAuditLogsFilter,
  IAuditLogsRepository,
  PaginatedAuditLogsOutput,
} from '../domain/repositories/audit-logs.repository.interface';
import { ImpersonationSession } from '../domain/entities/impersonation-session.entity';
import { AuditLog } from '../domain/entities/audit-log.entity';
import { InMemoryClientsRepository } from '../../clients/repositories/in-memory-clients.repository';

export class InMemoryImpersonationSessionsRepository implements IImpersonationSessionsRepository {
  public items: ImpersonationSession[] = [];

  constructor(private readonly clientsRepository?: InMemoryClientsRepository) {}

  async save(session: ImpersonationSession): Promise<void> {
    this.items.push(session);
  }

  async findById(id: string): Promise<ImpersonationSession | null> {
    return this.items.find((s) => s.id === id) ?? null;
  }

  async findActiveBySuperAdminId(superAdminUserId: string): Promise<ImpersonationSessionWithClient | null> {
    const session = this.items.find(
      (s) => s.superAdminUserId === superAdminUserId && s.isActive(),
    );

    if (!session) return null;

    let client = null;
    if (this.clientsRepository) {
      client = await this.clientsRepository.findById(session.targetClientId);
    }

    return {
      session,
      targetClient: {
        id: session.targetClientId,
        tradeName: client?.getTradeName() ?? 'Cliente Teste',
        legalName: client?.getLegalName() ?? 'Cliente Teste Ltda',
        document: client?.getDocument().getValue() ?? '00.000.000/0001-00',
        status: client?.getStatus() ?? 'ATIVO',
      },
    };
  }

  async findExpiredUnended(now = new Date()): Promise<ImpersonationSession[]> {
    return this.items.filter((s) => s.endedAt === null && s.expiresAt <= now);
  }

  async update(session: ImpersonationSession): Promise<void> {
    const idx = this.items.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.items[idx] = session;
    } else {
      this.items.push(session);
    }
  }
}

export class InMemoryAuditLogsRepository implements IAuditLogsRepository {
  public items: AuditLog[] = [];

  async save(auditLog: AuditLog): Promise<void> {
    this.items.push(auditLog);
  }

  async findManyPaginated(filter: FindAuditLogsFilter): Promise<PaginatedAuditLogsOutput> {
    let filtered = [...this.items];

    if (filter.clientId) {
      filtered = filtered.filter((l) => l.resourceType === 'Client' && l.resourceId === filter.clientId);
    }
    if (filter.action) {
      filtered = filtered.filter((l) => l.action === filter.action);
    }
    if (filter.from) {
      filtered = filtered.filter((l) => (l.createdAt ?? new Date()) >= filter.from!);
    }
    if (filter.to) {
      filtered = filtered.filter((l) => (l.createdAt ?? new Date()) <= filter.to!);
    }

    const total = filtered.length;
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const logs = filtered.slice(skip, skip + limit).map((log) => ({
      log,
      actor: {
        id: log.actorUserId,
        name: 'Super Admin',
        email: 'admin@rmfrotas.com',
      },
      impersonationSession: log.impersonationSessionId
        ? {
            id: log.impersonationSessionId,
            targetClientId: log.resourceId || 'client-1',
            targetClientName: 'Cliente Teste',
          }
        : null,
    }));

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
