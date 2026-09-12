import { OdometerSource } from '../../domain/value-objects/odometer-source.vo';

export interface RegisterOdometerReadingDto {
  vehicleId: string;
  clientId: string;
  ownerId: string;
  currentKm: number;
  source: OdometerSource;
  sourceId: string;
  recordedAt?: Date;
}
