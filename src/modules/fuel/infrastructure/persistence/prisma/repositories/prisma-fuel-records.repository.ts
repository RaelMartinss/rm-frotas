import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import {
  IFuelRecordsRepository,
  FindManyFuelRecordsParams,
  FindManyFuelRecordsOutput,
  FuelRecordWithRelations,
  FuelAggregatedStats,
} from '../../../../domain/repositories/fuel-records.repository';
import { FuelRecord } from '../../../../domain/entities/fuel-record.entity';
import { FuelType } from '../../../../domain/enums/fuel-type.enum';
import { PrismaFuelRecordMapper } from '../mappers/prisma-fuel-record.mapper';

@Injectable()
export class PrismaFuelRecordsRepository implements IFuelRecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(fuelRecord: FuelRecord): Promise<void> {
    const data = PrismaFuelRecordMapper.toPrisma(fuelRecord);

    await this.prisma.fuelRecord.upsert({
      where: { id: data.id },
      update: {
        fuelType: data.fuelType,
        liters: data.liters,
        pricePerUnit: data.pricePerUnit,
        totalCost: data.totalCost,
        odometerAtFueling: data.odometerAtFueling,
        gasStation: data.gasStation,
        fullTank: data.fullTank,
        receiptUrl: data.receiptUrl,
        fueledAt: data.fueledAt,
        notes: data.notes,
        updatedAt: data.updatedAt,
      },
      create: data,
    });
  }

  async findById(id: string): Promise<FuelRecord | null> {
    const raw = await this.prisma.fuelRecord.findUnique({
      where: { id },
    });

    if (!raw) return null;

    return PrismaFuelRecordMapper.toDomain(raw);
  }

  async findByIdWithRelations(id: string): Promise<FuelRecordWithRelations | null> {
    const raw = await this.prisma.fuelRecord.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: { id: true, plate: true, model: true, brand: true },
        },
        driver: {
          select: { id: true, name: true, cpf: true },
        },
      },
    });

    if (!raw) return null;

    return PrismaFuelRecordMapper.toDomainWithRelations(raw);
  }

  async findManyPaginated(params: FindManyFuelRecordsParams): Promise<FindManyFuelRecordsOutput> {
    const { ownerId, vehicleId, driverId, fuelType, fullTank, startDate, endDate, search, page, limit } = params;

    const where: any = {
      ownerId,
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
      ...(fuelType && { fuelType: fuelType as any }),
      ...(fullTank !== undefined && { fullTank }),
    };

    if (startDate || endDate) {
      where.fueledAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { gasStation: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { vehicle: { plate: { contains: term, mode: 'insensitive' } } },
        { vehicle: { model: { contains: term, mode: 'insensitive' } } },
        { driver: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [rawRecords, total] = await Promise.all([
      this.prisma.fuelRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fueledAt: 'desc' },
        include: {
          vehicle: {
            select: { id: true, plate: true, model: true, brand: true },
          },
          driver: {
            select: { id: true, name: true, cpf: true },
          },
        },
      }),
      this.prisma.fuelRecord.count({ where }),
    ]);

    return {
      records: rawRecords.map((r) => PrismaFuelRecordMapper.toDomainWithRelations(r)),
      total,
    };
  }

  async findLastByVehicle(vehicleId: string): Promise<FuelRecord | null> {
    const raw = await this.prisma.fuelRecord.findFirst({
      where: { vehicleId },
      orderBy: [{ fueledAt: 'desc' }, { odometerAtFueling: 'desc' }],
    });

    if (!raw) return null;

    return PrismaFuelRecordMapper.toDomain(raw);
  }

  async findAllByVehicleChronological(
    vehicleId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelRecord[]> {
    const where: any = { vehicleId };

    if (startDate || endDate) {
      where.fueledAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    const records = await this.prisma.fuelRecord.findMany({
      where,
      orderBy: [{ fueledAt: 'asc' }, { odometerAtFueling: 'asc' }],
    });

    return records.map((r) => PrismaFuelRecordMapper.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.fuelRecord.delete({
      where: { id },
    });
  }

  async getAggregatedStats(
    ownerId: string,
    params?: { vehicleId?: string; driverId?: string; startDate?: Date; endDate?: Date }
  ): Promise<FuelAggregatedStats> {
    const where: any = {
      ownerId,
      ...(params?.vehicleId && { vehicleId: params.vehicleId }),
      ...(params?.driverId && { driverId: params.driverId }),
    };

    if (params?.startDate || params?.endDate) {
      where.fueledAt = {
        ...(params?.startDate && { gte: params.startDate }),
        ...(params?.endDate && { lte: params.endDate }),
      };
    }

    const [aggregates, groupByType] = await Promise.all([
      this.prisma.fuelRecord.aggregate({
        where,
        _sum: {
          totalCost: true,
          liters: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.fuelRecord.groupBy({
        by: ['fuelType'],
        where,
        _sum: {
          totalCost: true,
          liters: true,
        },
      }),
    ]);

    const totalCost = aggregates._sum.totalCost ?? 0;
    const totalLiters = aggregates._sum.liters ?? 0;
    const totalRecords = aggregates._count.id ?? 0;
    const averagePricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    const costByFuelType = groupByType.map((g) => ({
      fuelType: g.fuelType as unknown as FuelType,
      totalCost: g._sum.totalCost ?? 0,
      totalLiters: g._sum.liters ?? 0,
    }));

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalRecords,
      averagePricePerLiter: Math.round(averagePricePerLiter * 100) / 100,
      costByFuelType,
    };
  }
}
