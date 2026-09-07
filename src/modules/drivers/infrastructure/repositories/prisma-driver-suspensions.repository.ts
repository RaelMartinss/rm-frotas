import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  IDriverSuspensionsRepository,
  FindDriverSuspensionsPaginatedParams,
  DriverSuspensionWithDriverDetails,
} from '../../domain/repositories/driver-suspensions.repository';
import { DriverSuspension } from '../../domain/entities/driver-suspension.entity';
import { DriverSuspensionMapper } from '../mappers/driver-suspension.mapper';

@Injectable()
export class PrismaDriverSuspensionsRepository
  implements IDriverSuspensionsRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(suspension: DriverSuspension): Promise<void> {
    const data = DriverSuspensionMapper.toPrisma(suspension);
    await this.prisma.driverSuspension.create({
      data,
    });
  }

  async save(suspension: DriverSuspension): Promise<void> {
    const data = DriverSuspensionMapper.toPrisma(suspension);
    await this.prisma.driverSuspension.update({
      where: { id: data.id },
      data,
    });
  }

  async findById(id: string): Promise<DriverSuspension | null> {
    const raw = await this.prisma.driverSuspension.findUnique({
      where: { id },
    });

    if (!raw) return null;
    return DriverSuspensionMapper.toDomain(raw);
  }

  async findActiveByDriverId(driverId: string): Promise<DriverSuspension | null> {
    const raw = await this.prisma.driverSuspension.findFirst({
      where: {
        driverId,
        status: 'ATIVA',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!raw) return null;
    return DriverSuspensionMapper.toDomain(raw);
  }

  async findAllByDriverId(
    driverId: string,
    params: FindDriverSuspensionsPaginatedParams,
  ): Promise<{ suspensions: DriverSuspension[]; total: number }> {
    const skip = (params.page - 1) * params.limit;

    const [records, total] = await Promise.all([
      this.prisma.driverSuspension.findMany({
        where: { driverId },
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverSuspension.count({
        where: { driverId },
      }),
    ]);

    return {
      suspensions: records.map(DriverSuspensionMapper.toDomain),
      total,
    };
  }

  async findAllActiveByOwnerId(
    ownerId: string,
    params: FindDriverSuspensionsPaginatedParams,
  ): Promise<{
    suspensions: DriverSuspensionWithDriverDetails[];
    total: number;
  }> {
    const skip = (params.page - 1) * params.limit;

    const [records, total] = await Promise.all([
      this.prisma.driverSuspension.findMany({
        where: {
          ownerId,
          status: 'ATIVA',
        },
        include: {
          driver: {
            select: {
              name: true,
              cpf: true,
            },
          },
        },
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverSuspension.count({
        where: {
          ownerId,
          status: 'ATIVA',
        },
      }),
    ]);

    return {
      suspensions: records.map((rec) => ({
        suspension: DriverSuspensionMapper.toDomain(rec),
        driverName: rec.driver?.name,
        driverCpf: rec.driver?.cpf,
      })),
      total,
    };
  }
}
