import { Vehicle } from "../entities/vehicle.entity";


export abstract class IVehiclesRepository {
    abstract save(vehicle: Vehicle): Promise<void>;
    abstract findById(id: string): Promise<Vehicle | null>;
  abstract findByPlate(plate: string): Promise<Vehicle | null>;
}