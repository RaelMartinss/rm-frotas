import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import {
  FindManyMaintenancesPaginatedOutput,
  FindManyMaintenancesPaginatedParams,
  IMaintenancesRepository,
  MaintenanceStatsOutput,
  MaintenanceWithVehicleDetails,
} from '../../../../domain/repositories/maintenances.repository';
import { Maintenance } from '../../../../domain/entities/maintenance.entity';
import { MaintenanceStatus } from '../../../../domain/enums/maintenance-status.enum';
import { PrismaMaintenanceMapper } from '../mappers/prisma-maintenance.mapper';
import { MaintenanceStatus as PrismaMaintenanceStatus, MaintenanceType as PrismaMaintenanceType } from '@prisma/client';

@Injectable()
export class PrismaMaintenancesRepository implements IMaintenancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(maintenance: Maintenance): Promise<void> {
    const { maintenanceData, itemsData } = PrismaMaintenanceMapper.toPrisma(maintenance);

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenance.upsert({
        where: { id: maintenanceData.id },
        update: maintenanceData,
        create: maintenanceData,
      });

      // Sincroniza itens: remove antigos e insere os atuais
      await tx.maintenanceItem.deleteMany({
        where: { maintenanceId: maintenanceData.id },
      });

      if (itemsData.length > 0) {
        await tx.maintenanceItem.createMany({
          data: itemsData,
        });
      }
    });
  }

  async findById(id: string): Promise<Maintenance | null> {
    const record = await this.prisma.maintenance.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!record) return null;
    return PrismaMaintenanceMapper.toDomain(record);
  }

  async findByIdWithVehicle(id: string): Promise<MaintenanceWithVehicleDetails | null> {
    const record = await this.prisma.maintenance.findUnique({
      where: { id },
      include: { items: true, vehicle: true },
    });

    if (!record) return null;
    return PrismaMaintenanceMapper.toDomainWithVehicle(record);
  }

  async findActiveByVehicleId(vehicleId: string): Promise<Maintenance | null> {
    const record = await this.prisma.maintenance.findFirst({
      where: {
        vehicleId,
        status: PrismaMaintenanceStatus.EM_ANDAMENTO,
      },
      include: { items: true },
    });

    if (!record) return null;
    return PrismaMaintenanceMapper.toDomain(record);
  }

  async findManyPaginated({
    ownerId,
    vehicleId,
    status,
    type,
    from,
    to,
    page,
    limit,
  }: FindManyMaintenancesPaginatedParams): Promise<FindManyMaintenancesPaginatedOutput> {
    const where: any = {
      ownerId,
      ...(vehicleId && { vehicleId }),
      ...(status && { status: status as PrismaMaintenanceStatus }),
      ...(type && { type: type as PrismaMaintenanceType }),
    };

    if (from || to) {
      where.createdAt = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.maintenance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, vehicle: true },
      }),
      this.prisma.maintenance.count({ where }),
    ]);

    return {
      maintenances: records.map((record) =>
        PrismaMaintenanceMapper.toDomainWithVehicle(record)
      ),
      total,
    };
  }

  async getStats(ownerId: string, from?: Date, to?: Date): Promise<MaintenanceStatsOutput> {
    const where: any = {
      ownerId,
    };

    if (from || to) {
      where.createdAt = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const maintenances = await this.prisma.maintenance.findMany({
      where,
      select: {
        status: true,
        type: true,
        cost: true,
      },
    });

    let totalCost = 0;
    let preventiveCost = 0;
    let correctiveCost = 0;
    let scheduledCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let canceledCount = 0;

    for (const m of maintenances) {
      const cost = m.cost || 0;
      totalCost += cost;

      if (m.type === PrismaMaintenanceType.PREVENTIVA) {
        preventiveCost += cost;
      } else if (m.type === PrismaMaintenanceType.CORRETIVA) {
        correctiveCost += cost;
      }

      switch (m.status) {
        case PrismaMaintenanceStatus.AGENDADA:
          scheduledCount++;
          break;
        case PrismaMaintenanceStatus.EM_ANDAMENTO:
          inProgressCount++;
          break;
        case PrismaMaintenanceStatus.CONCLUIDA:
          completedCount++;
          break;
        case PrismaMaintenanceStatus.CANCELADA:
          canceledCount++;
          break;
      }
    }

    return {
      totalCost,
      totalMaintenances: maintenances.length,
      scheduledCount,
      inProgressCount,
      completedCount,
      canceledCount,
      preventiveCost,
      correctiveCost,
    };
  }
}
