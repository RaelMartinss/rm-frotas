import { Inject, Injectable } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import { TripStatus } from '../../domain/entities/trip-status.enum';

export interface GetTripsInput {
  status?: TripStatus;
  driverId?: string;
  vehicleId?: string;
  page?: number;
  limit?: number;
}

export interface GetTripsOutput {
  data: Trip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetTripsUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
  ) {}

  async execute(input: GetTripsInput): Promise<GetTripsOutput> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { trips, total } = await this.tripsRepository.findManyPaginated({
      status: input.status,
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      page,
      limit,
    });

    return {
      data: trips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}