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
      brand: raw.brand,
      model: raw.model,
      year: raw.year,
      currentKm: raw.currentKm,
      crlvExpiration: raw.crlvExpiration,
      status: raw.status as VehicleStatus,
      ownerId: raw.ownerId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPrisma(vehicle: Vehicle) {
    const ownerId = vehicle.getOwnerId() ?? process.env.DEFAULT_OWNER_ID;

    if (!ownerId) {
      throw new Error(`Vehicle ${vehicle.getId()} must have an ownerId to be persisted.`);
    }

    return {
      id: vehicle.getId(),
      plate: vehicle.getPlate().getValue(),
      brand: vehicle.getBrand(),
      model: vehicle.getModel(),
      year: vehicle.getYear(),
      currentKm: vehicle.getCurrentKm(),
      crlvExpiration: vehicle.getCrlvExpiration() ?? null,
      status: vehicle.getStatus() as PrismaStatus,
      ownerId,
      createdAt: vehicle.getCreatedAt(),
      updatedAt: vehicle.getUpdatedAt(),
    };
  }
}