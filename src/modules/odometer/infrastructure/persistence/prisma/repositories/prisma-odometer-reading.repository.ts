import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import {
  IOdometerReadingsRepository,
  FindOdometerHistoryParams,
} from '../../../../domain/repositories/odometer-reading.repository.interface';
import { OdometerReading } from '../../../../domain/entities/odometer-reading.entity';
import { PrismaOdometerReadingMapper } from '../mappers/prisma-odometer-reading.mapper';
import { Prisma, OdometerSource as PrismaOdometerSource } from '@prisma/client';

@Injectable()
export class PrismaOdometerReadingRepository implements IOdometerReadingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(reading: OdometerReading): Promise<void> {
    const data = PrismaOdometerReadingMapper.toPrisma(reading);
    await this.prisma.odometerReading.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findLatestByVehicle(vehicleId: string): Promise<OdometerReading | null> {
    const raw = await this.prisma.odometerReading.findFirst({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
    });
    return raw ? PrismaOdometerReadingMapper.toDomain(raw) : null;
  }

  async findById(id: string): Promise<OdometerReading | null> {
    const raw = await this.prisma.odometerReading.findUnique({
      where: { id },
    });
    return raw ? PrismaOdometerReadingMapper.toDomain(raw) : null;
  }

  async findHistoryByVehicle(
    params: FindOdometerHistoryParams,
  ): Promise<{ readings: OdometerReading[]; total: number }> {
    const { vehicleId, clientId, page = 1, limit = 20, source, startDate, endDate } = params;

    const where: Prisma.OdometerReadingWhereInput = {
      vehicleId,
      clientId,
      ...(source ? { source: source as PrismaOdometerSource } : {}),
      ...(startDate || endDate
        ? {
            recordedAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [raws, total] = await Promise.all([
      this.prisma.odometerReading.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.odometerReading.count({ where }),
    ]);

    return {
      readings: raws.map((r) => PrismaOdometerReadingMapper.toDomain(r)),
      total,
    };
  }
}
