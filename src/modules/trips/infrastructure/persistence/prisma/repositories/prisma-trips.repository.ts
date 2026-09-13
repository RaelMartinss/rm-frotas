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
    ownerId,
    clientId,
    search,
    page,
    limit,
  }: FindManyPaginatedParams): Promise<FindManyPaginatedOutput> {
    const where: any = {
      ...(status && { status }),
      ...(driverId && { driverId }),
      ...(vehicleId && { vehicleId }),
    };

    if (clientId) {
      where.clientId = clientId;
    } else if (ownerId) {
      where.OR = [
        { clientId: ownerId },
        { vehicle: { ownerId } },
        { driver: { ownerId } },
      ];
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { driver: { name: { contains: term, mode: 'insensitive' } } },
            { driver: { cpf: { contains: term, mode: 'insensitive' } } },
            { vehicle: { plate: { contains: term, mode: 'insensitive' } } },
            { vehicle: { model: { contains: term, mode: 'insensitive' } } },
            { vehicle: { brand: { contains: term, mode: 'insensitive' } } },
            { originAddress: { contains: term, mode: 'insensitive' } },
            { originCity: { contains: term, mode: 'insensitive' } },
            { destinationAddress: { contains: term, mode: 'insensitive' } },
            { destinationCity: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

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