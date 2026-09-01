import { Trip } from "../../domain/entities/trip.entity";

export interface ITripsRepository {
  create(trip: Trip): Promise<void>;
  findById(id: string): Promise<Trip | null>;
  findActiveByDriverId(driverId: string): Promise<Trip | null>;
  findActiveByVehicleId(vehicleId: string): Promise<Trip | null>;
  save(trip: Trip): Promise<void>;
}