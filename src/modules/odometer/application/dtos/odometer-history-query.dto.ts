import { OdometerSource } from '../../domain/value-objects/odometer-source.vo';

export interface OdometerHistoryQueryDto {
  vehicleId: string;
  clientId: string;
  page?: number;
  limit?: number;
  source?: OdometerSource;
  startDate?: Date;
  endDate?: Date;
}
