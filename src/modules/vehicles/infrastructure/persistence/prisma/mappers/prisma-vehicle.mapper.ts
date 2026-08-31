import { Vehicle as PrismaVehicleModel, VehicleStatus as PrismaStatus } from '../../../../../../../generated/prisma/index.js';
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
    return {
      id: vehicle.getId(),
      plate: vehicle.getPlate().getValue(),
      model: vehicle.getModel(),
      year: vehicle.getYear(),
      currentKm: vehicle.getCurrentKm(),
      status: vehicle.getStatus() as PrismaStatus,
      createdAt: vehicle.getCreatedAt(),
      updatedAt: vehicle.getUpdatedAt(),
    };
  }
}