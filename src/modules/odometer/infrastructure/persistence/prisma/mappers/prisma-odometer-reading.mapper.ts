import { OdometerReading as PrismaOdometerReading, OdometerSource as PrismaOdometerSource } from '@prisma/client';
import { OdometerReading } from '../../../../domain/entities/odometer-reading.entity';
import { OdometerSource } from '../../../../domain/value-objects/odometer-source.vo';
import { Kilometers } from '../../../../domain/value-objects/kilometers.vo';

export class PrismaOdometerReadingMapper {
  static toDomain(raw: PrismaOdometerReading): OdometerReading {
    return new OdometerReading({
      id: raw.id,
      clientId: raw.clientId,
      vehicleId: raw.vehicleId,
      ownerId: raw.ownerId,
      previousKm: new Kilometers(raw.previousKm),
      currentKm: new Kilometers(raw.currentKm),
      source: raw.source as OdometerSource,
      sourceId: raw.sourceId,
      recordedAt: raw.recordedAt,
      correctedFromId: raw.correctedFromId,
      reason: raw.reason,
      createdAt: raw.createdAt,
    });
  }

  static toPrisma(domain: OdometerReading): PrismaOdometerReading {
    return {
      id: domain.getId(),
      clientId: domain.getClientId(),
      vehicleId: domain.getVehicleId(),
      ownerId: domain.getOwnerId(),
      previousKm: domain.getPreviousKm().getValue(),
      currentKm: domain.getCurrentKm().getValue(),
      source: domain.getSource() as PrismaOdometerSource,
      sourceId: domain.getSourceId(),
      recordedAt: domain.getRecordedAt(),
      correctedFromId: domain.getCorrectedFromId(),
      reason: domain.getReason(),
      createdAt: domain.getCreatedAt(),
    };
  }
}
