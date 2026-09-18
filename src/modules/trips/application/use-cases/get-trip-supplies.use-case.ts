import { Inject, Injectable } from '@nestjs/common';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import { ListFuelRecordsUseCase } from '../../../fuel/application/use-cases/list-fuel-records.use-case';
import { FuelRecordWithRelations } from '../../../fuel/domain/repositories/fuel-records.repository';

export interface GetTripSuppliesInput {
  tripId: string;
  ownerId: string;
  clientId?: string;
}

export interface GetTripSuppliesOutput {
  tripId: string;
  vehicleId: string;
  driverId: string;
  total: number;
  supplies: FuelRecordWithRelations[];
}

@Injectable()
export class GetTripSuppliesUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    private readonly listFuelRecordsUseCase: ListFuelRecordsUseCase,
  ) {}

  async execute(input: GetTripSuppliesInput): Promise<GetTripSuppliesOutput> {
    const trip = await this.tripsRepository.findById(input.tripId);
    if (!trip) {
      throw new TripNotFoundException('Viagem não encontrada.');
    }

    const result = await this.listFuelRecordsUseCase.execute({
      ownerId: input.ownerId,
      clientId: input.clientId,
      vehicleId: trip.getVehicleId(),
      driverId: trip.getDriverId(),
      startDate: trip.getStartedAt() ?? trip.getScheduledDate() ?? trip.getCreatedAt(),
      endDate: trip.getCompletedAt() ?? undefined,
      limit: 100,
    });

    return {
      tripId: trip.getId(),
      vehicleId: trip.getVehicleId(),
      driverId: trip.getDriverId(),
      total: result.total,
      supplies: result.records,
    };
  }
}
