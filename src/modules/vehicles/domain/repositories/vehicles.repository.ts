import { Vehicle, VehicleStatus } from "../entities/vehicle.entity";

export interface FindManyVehiclesPaginatedParams {
  ownerId?: string;
  clientId?: string;
  status?: VehicleStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface FindManyVehiclesPaginatedOutput {
  vehicles: Vehicle[];
  total: number;
}

export abstract class IVehiclesRepository {
  abstract save(vehicle: Vehicle): Promise<void>;
  abstract createMany(vehicles: Vehicle[]): Promise<void>;
  abstract findById(id: string): Promise<Vehicle | null>;
  abstract findByPlate(plate: string): Promise<Vehicle | null>;
  abstract findExistingPlates(plates: string[]): Promise<string[]>;
  abstract findAll(ownerId?: string): Promise<Vehicle[]>;
  abstract findManyPaginated(
    params: FindManyVehiclesPaginatedParams
  ): Promise<FindManyVehiclesPaginatedOutput>;
}