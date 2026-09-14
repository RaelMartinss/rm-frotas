import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import {
  IImpersonationSessionsRepository,
  ImpersonationSessionWithClient,
} from '../../../domain/repositories/impersonation-sessions.repository.interface';
import { ImpersonationSession } from '../../../domain/entities/impersonation-session.entity';
import { PrismaImpersonationSessionMapper } from './mappers/prisma-impersonation-session.mapper';

@Injectable()
export class PrismaImpersonationSessionsRepository implements IImpersonationSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: ImpersonationSession): Promise<void> {
    const data = PrismaImpersonationSessionMapper.toPersistence(session);
    await this.prisma.impersonationSession.create({
      data,
    });
  }

  async findById(id: string): Promise<ImpersonationSession | null> {
    const raw = await this.prisma.impersonationSession.findUnique({
      where: { id },
    });
    return raw ? PrismaImpersonationSessionMapper.toDomain(raw) : null;
  }

  async findActiveBySuperAdminId(superAdminUserId: string): Promise<ImpersonationSessionWithClient | null> {
    const raw = await this.prisma.impersonationSession.findFirst({
      where: {
        superAdminUserId,
        endedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        targetClient: {
          select: {
            id: true,
            tradeName: true,
            legalName: true,
            document: true,
            status: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!raw) return null;

    return {
      session: PrismaImpersonationSessionMapper.toDomain(raw),
      targetClient: raw.targetClient,
    };
  }

  async findExpiredUnended(now: Date = new Date()): Promise<ImpersonationSession[]> {
    const raws = await this.prisma.impersonationSession.findMany({
      where: {
        endedAt: null,
        expiresAt: {
          lte: now,
        },
      },
    });

    return raws.map((r) => PrismaImpersonationSessionMapper.toDomain(r));
  }

  async update(session: ImpersonationSession): Promise<void> {
    const data = PrismaImpersonationSessionMapper.toPersistence(session);
    await this.prisma.impersonationSession.update({
      where: { id: session.id },
      data: {
        endedAt: data.endedAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}
