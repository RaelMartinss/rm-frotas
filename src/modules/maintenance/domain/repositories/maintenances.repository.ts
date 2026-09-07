import { Maintenance } from '../entities/maintenance.entity';
import { MaintenanceStatus } from '../enums/maintenance-status.enum';
import { MaintenanceType } from '../enums/maintenance-type.enum';

export interface FindManyMaintenancesPaginatedParams {
  ownerId: string;
  vehicleId?: string;
  status?: MaintenanceStatus;
  type?: MaintenanceType;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface MaintenanceWithVehicleDetails {
  maintenance: Maintenance;
  vehicle?: {
    id: string;
    plate: string;
    model: string;
    brand: string | null;
    currentKm: number;
  };
}

export interface FindManyMaintenancesPaginatedOutput {
  maintenances: MaintenanceWithVehicleDetails[];
  total: number;
}

export interface MaintenanceStatsOutput {
  totalCost: number;
  totalMaintenances: number;
  scheduledCount: number;
  inProgressCount: number;
  completedCount: number;
  canceledCount: number;
  preventiveCost: number;
  correctiveCost: number;
}

export abstract class IMaintenancesRepository {
  abstract save(maintenance: Maintenance): Promise<void>;
  abstract findById(id: string): Promise<Maintenance | null>;
  abstract findByIdWithVehicle(id: string): Promise<MaintenanceWithVehicleDetails | null>;
  abstract findActiveByVehicleId(vehicleId: string): Promise<Maintenance | null>;
  abstract findManyPaginated(
    params: FindManyMaintenancesPaginatedParams
  ): Promise<FindManyMaintenancesPaginatedOutput>;
  abstract getStats(ownerId: string, from?: Date, to?: Date): Promise<MaintenanceStatsOutput>;
}
