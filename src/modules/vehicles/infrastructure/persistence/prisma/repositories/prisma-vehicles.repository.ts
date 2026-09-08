import { Injectable } from '@nestjs/common';
import {
  IVehiclesRepository,
  FindManyVehiclesPaginatedParams,
  FindManyVehiclesPaginatedOutput,
} from '../../../../domain/repositories/vehicles.repository';
import { Vehicle } from '../../../../domain/entities/vehicle.entity';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { PrismaVehicleMapper } from '../mappers/prisma-vehicle.mapper';

@Injectable()
export class PrismaVehiclesRepository implements IVehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(vehicle: Vehicle): Promise<void> {
    const data = PrismaVehicleMapper.toPrisma(vehicle);

    await this.prisma.vehicle.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }

  async createMany(vehicles: Vehicle[]): Promise<void> {
    if (vehicles.length === 0) return;
    const data = vehicles.map(PrismaVehicleMapper.toPrisma);
    await this.prisma.vehicle.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async findById(id: string): Promise<Vehicle | null> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) return null;

    return PrismaVehicleMapper.toDomain(vehicle);
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { plate },
    });

    if (!vehicle) return null;

    return PrismaVehicleMapper.toDomain(vehicle);
  }

  async findExistingPlates(plates: string[]): Promise<string[]> {
    if (plates.length === 0) return [];
    const existing = await this.prisma.vehicle.findMany({
      where: {
        plate: { in: plates },
      },
      select: {
        plate: true,
      },
    });

    return existing.map((v) => v.plate);
  }

  async findAll(ownerId?: string): Promise<Vehicle[]> {
    const vehicle = await this.prisma.vehicle.findMany({
      where: ownerId ? { ownerId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return vehicle.map(PrismaVehicleMapper.toDomain);
  }

  async findManyPaginated({
    ownerId,
    status,
    search,
    page,
    limit,
  }: FindManyVehiclesPaginatedParams): Promise<FindManyVehiclesPaginatedOutput> {
    const targetOwnerId = ownerId ?? '__NO_OWNER__';
    const where: any = {
      ownerId: targetOwnerId,
      ...(status && { status }),
    };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { plate: { contains: term, mode: 'insensitive' } },
        { model: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [rawVehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      vehicles: rawVehicles.map(PrismaVehicleMapper.toDomain),
      total,
    };
  }
}