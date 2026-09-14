import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import {
  FindAuditLogsFilter,
  IAuditLogsRepository,
  PaginatedAuditLogsOutput,
} from '../../../domain/repositories/audit-logs.repository.interface';
import { AuditLog } from '../../../domain/entities/audit-log.entity';
import { PrismaAuditLogMapper } from './mappers/prisma-audit-log.mapper';

@Injectable()
export class PrismaAuditLogsRepository implements IAuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(log: AuditLog): Promise<void> {
    const data = PrismaAuditLogMapper.toPersistence(log);
    await this.prisma.auditLog.create({
      data,
    });
  }

  async findManyPaginated(filter: FindAuditLogsFilter): Promise<PaginatedAuditLogsOutput> {
    const { clientId, action, from, to, page, limit } = filter;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (clientId) {
      where.OR = [
        { resourceId: clientId },
        { impersonationSession: { targetClientId: clientId } },
      ];
    }

    if (from || to) {
      where.createdAt = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const skip = (page - 1) * limit;

    const [rawLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          impersonationSession: {
            select: {
              id: true,
              targetClientId: true,
              targetClient: {
                select: {
                  tradeName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const logs = rawLogs.map((raw) => ({
      log: PrismaAuditLogMapper.toDomain(raw),
      actor: {
        id: raw.actorUser.id,
        name: raw.actorUser.name,
        email: raw.actorUser.email,
      },
      impersonationSession: raw.impersonationSession
        ? {
            id: raw.impersonationSession.id,
            targetClientId: raw.impersonationSession.targetClientId,
            targetClientName: raw.impersonationSession.targetClient?.tradeName,
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
