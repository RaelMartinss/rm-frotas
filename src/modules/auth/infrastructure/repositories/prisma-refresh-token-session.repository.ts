import { Injectable } from '@nestjs/common';
import { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import { RefreshTokenSession } from '../../domain/entities/refresh-token-session.entity';
import { DeviceInfo } from '../../domain/value-objects/device-info.vo';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaRefreshTokenSessionRepository
  implements IRefreshTokenSessionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(session: RefreshTokenSession): Promise<void> {
    const data = {
      id: session.getId(),
      userId: session.getUserId(),
      tokenHash: session.getTokenHash(),
      platform: session.getDeviceInfo().getPlatform(),
      userAgent: session.getDeviceInfo().getUserAgent() ?? null,
      expiresAt: session.getExpiresAt(),
      revokedAt: session.getRevokedAt(),
      createdAt: session.getCreatedAt(),
    };

    await this.prisma.refreshTokenSession.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenSession | null> {
    const record = await this.prisma.refreshTokenSession.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAllActiveByUserId(userId: string): Promise<RefreshTokenSession[]> {
    const records = await this.prisma.refreshTokenSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(raw: {
    id: string;
    userId: string;
    tokenHash: string;
    platform: string;
    userAgent: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }): RefreshTokenSession {
    return RefreshTokenSession.restore({
      id: raw.id,
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      deviceInfo: DeviceInfo.create(raw.platform, raw.userAgent ?? undefined),
      expiresAt: raw.expiresAt,
      revokedAt: raw.revokedAt,
      createdAt: raw.createdAt,
    });
  }
}
