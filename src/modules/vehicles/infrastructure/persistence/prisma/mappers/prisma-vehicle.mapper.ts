import {
  Vehicle as PrismaVehicleModel,
  VehicleStatus as PrismaStatus,
} from '@prisma/client';
import { Vehicle, VehicleStatus } from '../../../../domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../domain/value-objects/license-plate.vo';

export class PrismaVehicleMapper {
  static toDomain(raw: PrismaVehicleModel): Vehicle {
    return new Vehicle({
      id: raw.id,
      plate: new LicensePlate(raw.plate),
      model: raw.model,
      year: raw.year,
      currentKm: raw.currentKm,
      status: raw.status as VehicleStatus,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPrisma(vehicle: Vehicle) {
    const ownerId = process.env.DEFAULT_OWNER_ID ?? '00000000-0000-0000-0000-000000000000';

    return {
      id: vehicle.getId(),
      plate: vehicle.getPlate().getValue(),
      model: vehicle.getModel(),
      year: vehicle.getYear(),
      currentKm: vehicle.getCurrentKm(),
      status: vehicle.getStatus() as PrismaStatus,
      ownerId,
      createdAt: vehicle.getCreatedAt(),
      updatedAt: vehicle.getUpdatedAt(),
    };
  }
}