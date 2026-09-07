import { Injectable } from '@nestjs/common';
import {
  IMaintenancesRepository,
  MaintenanceStatsOutput,
} from '../../domain/repositories/maintenances.repository';

export interface GetMaintenanceStatsInput {
  ownerId: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class GetMaintenanceStatsUseCase {
  constructor(private readonly maintenanceRepository: IMaintenancesRepository) {}

  async execute(input: GetMaintenanceStatsInput): Promise<MaintenanceStatsOutput> {
    return this.maintenanceRepository.getStats(input.ownerId, input.from, input.to);
  }
}
