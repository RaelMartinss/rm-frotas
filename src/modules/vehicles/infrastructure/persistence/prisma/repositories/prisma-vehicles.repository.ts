import { Injectable } from '@nestjs/common';
import { IVehiclesRepository } from '../../../../domain/repositories/vehicles.repository';
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

  async findAll(): Promise<Vehicle[]> {
    const vehicle = await this.prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return vehicle.map(PrismaVehicleMapper.toDomain);
  }
}