import { Injectable } from '@nestjs/common';

import {
  ITripsRepository,
  FindManyPaginatedParams,
  FindManyPaginatedOutput,
} from '../../../../domain/repositories/trips.repository.interface';
import { Trip } from '../../../../domain/entities/trip.entity';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { TripMapper } from '../../../mappers/trip.mapper';

@Injectable()
export class PrismaTripsRepository implements ITripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(trip: Trip): Promise<void> {
    const data = TripMapper.toPrisma(trip);

    await this.prisma.trip.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
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

  async findManyPaginated({
    status,
    driverId,
    vehicleId,
    page,
    limit,
  }: FindManyPaginatedParams): Promise<FindManyPaginatedOutput> {
    const where = {
      ...(status && { status }),
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