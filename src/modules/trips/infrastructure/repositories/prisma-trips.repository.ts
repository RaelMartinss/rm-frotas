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

  async findManyPaginated({
    status,
    driverId,
    vehicleId,
    page,
    limit,
  }: {
    status?: TripStatus;
    driverId?: string;
    vehicleId?: string;
    page: number;
    limit: number;
  }): Promise<{ trips: Trip[]; total: number }> {
    const where = {
      ...(status !== undefined && { status }),
      ...(driverId && { driverId }),
      ...(vehicleId && { vehicleId }),
    };

    const skip = (page - 1) * limit;

    const [rawTrips, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return {
      trips: rawTrips.map(TripMapper.toDomain),
      total,
    };
  }
}