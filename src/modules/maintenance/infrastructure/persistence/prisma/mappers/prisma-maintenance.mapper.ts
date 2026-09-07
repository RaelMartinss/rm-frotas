import {
  Maintenance as PrismaMaintenance,
  MaintenanceItem as PrismaMaintenanceItem,
  MaintenanceStatus as PrismaMaintenanceStatus,
  MaintenanceType as PrismaMaintenanceType,
  Vehicle as PrismaVehicle,
} from '@prisma/client';
import { Maintenance } from '../../../../domain/entities/maintenance.entity';
import { MaintenanceStatus } from '../../../../domain/enums/maintenance-status.enum';
import { MaintenanceType } from '../../../../domain/enums/maintenance-type.enum';
import { MaintenanceItem } from '../../../../domain/value-objects/maintenance-item.vo';
import { MaintenanceWithVehicleDetails } from '../../../../domain/repositories/maintenances.repository';

export type PrismaMaintenanceWithRelations = PrismaMaintenance & {
  items?: PrismaMaintenanceItem[];
  vehicle?: PrismaVehicle;
};

export class PrismaMaintenanceMapper {
  static toDomain(raw: PrismaMaintenanceWithRelations): Maintenance {
    const items = (raw.items || []).map(
      (item) =>
        new MaintenanceItem({
          id: item.id,
          name: item.name,
          cost: item.cost,
          quantity: item.quantity,
        })
    );

    return new Maintenance({
      id: raw.id,
      vehicleId: raw.vehicleId,
      ownerId: raw.ownerId,
      type: raw.type as MaintenanceType,
      status: raw.status as MaintenanceStatus,
      description: raw.description,
      serviceProvider: raw.serviceProvider,
      scheduledDate: raw.scheduledDate,
      startedAt: raw.startedAt,
      finishedAt: raw.finishedAt,
      odometerAtService: raw.odometerAtService,
      cost: raw.cost,
      items,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toDomainWithVehicle(raw: PrismaMaintenanceWithRelations): MaintenanceWithVehicleDetails {
    const maintenance = this.toDomain(raw);
    return {
      maintenance,
      vehicle: raw.vehicle
        ? {
            id: raw.vehicle.id,
            plate: raw.vehicle.plate,
            model: raw.vehicle.model,
            brand: raw.vehicle.brand,
            currentKm: raw.vehicle.currentKm,
          }
        : undefined,
    };
  }

  static toPrisma(maintenance: Maintenance): {
    maintenanceData: Omit<PrismaMaintenance, 'createdAt' | 'updatedAt'> & {
      createdAt: Date;
      updatedAt: Date;
    };
    itemsData: Array<{
      id: string;
      maintenanceId: string;
      name: string;
      cost: number;
      quantity: number;
    }>;
  } {
    const itemsData = maintenance.getItems().map((item) => ({
      id: item.id,
      maintenanceId: maintenance.getId(),
      name: item.name,
      cost: item.cost.amount,
      quantity: item.quantity,
    }));

    const maintenanceData = {
      id: maintenance.getId(),
      vehicleId: maintenance.getVehicleId(),
      ownerId: maintenance.getOwnerId(),
      type: maintenance.getType() as PrismaMaintenanceType,
      status: maintenance.getStatus() as PrismaMaintenanceStatus,
      description: maintenance.getDescription(),
      serviceProvider: maintenance.getServiceProvider() ?? null,
      scheduledDate: maintenance.getScheduledDate() ?? null,
      startedAt: maintenance.getStartedAt() ?? null,
      finishedAt: maintenance.getFinishedAt() ?? null,
      odometerAtService: maintenance.getOdometerAtService() ?? null,
      cost: maintenance.getCost().amount,
      createdAt: maintenance.getCreatedAt(),
      updatedAt: maintenance.getUpdatedAt(),
    };

    return { maintenanceData, itemsData };
  }
}
