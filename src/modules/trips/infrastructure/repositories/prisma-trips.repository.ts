import { Injectable } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/entities/trip-status.enum';
import { TripMapper } from '../mappers/trip.mapper';
import { ITripsRepository } from '../../application/repositories/trips-repository.interface';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaTripsRepository implements ITripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(trip: Trip): Promise<void> {
    const data = TripMapper.toPrisma(trip);
    await this.prisma.trip.create({ data });
  }

  async findById(id: string): Promise<Trip | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      return null;
    }

    return TripMapper.toDomain(trip);
  }

  async findActiveByDriverId(driverId: string): Promise<Trip | null> {
    const trip = await this.prisma.trip.findFirst({
      where: {
        driverId,
        status: {
          in: [TripStatus.PLANNED, TripStatus.IN_PROGRESS],
        },
      },
    });

    if (!trip) {
      return null;
    }

    return TripMapper.toDomain(trip);
  }

  async findActiveByVehicleId(vehicleId: string): Promise<Trip | null> {
    const trip = await this.prisma.trip.findFirst({
      where: {
        vehicleId,
        status: {
          in: [TripStatus.PLANNED, TripStatus.IN_PROGRESS],
        },
      },
    });

    if (!trip) {
      return null;
    }

    return TripMapper.toDomain(trip);
  }

  async save(trip: Trip): Promise<void> {
    const data = TripMapper.toPrisma(trip);
    await this.prisma.trip.update({
      where: { id: data.id },
      data,
    });
  }
}