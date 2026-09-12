import { OdometerReading } from '../entities/odometer-reading.entity';
import { OdometerSource } from '../value-objects/odometer-source.vo';

export interface FindOdometerHistoryParams {
  vehicleId: string;
  clientId: string;
  page?: number;
  limit?: number;
  source?: OdometerSource;
  startDate?: Date;
  endDate?: Date;
}

export abstract class IOdometerReadingsRepository {
  abstract save(reading: OdometerReading): Promise<void>;
  abstract findLatestByVehicle(vehicleId: string): Promise<OdometerReading | null>;
  abstract findById(id: string): Promise<OdometerReading | null>;
  abstract findHistoryByVehicle(
    params: FindOdometerHistoryParams,
  ): Promise<{ readings: OdometerReading[]; total: number }>;
}

export const I_ODOMETER_READINGS_REPOSITORY = 'IOdometerReadingsRepository';
