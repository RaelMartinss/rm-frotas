export interface CorrectOdometerReadingDto {
  vehicleId: string;
  clientId: string;
  ownerId: string;
  currentKm: number;
  reason: string;
  recordedAt?: Date;
}
