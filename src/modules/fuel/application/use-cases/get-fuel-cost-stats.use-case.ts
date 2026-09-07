import { Injectable } from '@nestjs/common';
import {
  IFuelRecordsRepository,
  FuelAggregatedStats,
} from '../../domain/repositories/fuel-records.repository';

export interface GetFuelCostStatsInput {
  ownerId: string;
  vehicleId?: string;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class GetFuelCostStatsUseCase {
  constructor(private readonly fuelRecordsRepository: IFuelRecordsRepository) {}

  async execute(input: GetFuelCostStatsInput): Promise<FuelAggregatedStats> {
    return this.fuelRecordsRepository.getAggregatedStats(input.ownerId, {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  }
}
