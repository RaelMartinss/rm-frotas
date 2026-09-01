import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/entities/trip-status.enum';

export interface ITripsRepository {
  create(trip: Trip): Promise<void>;
  findById(id: string): Promise<Trip | null>;
  findActiveByDriverId(driverId: string): Promise<Trip | null>;
  findActiveByVehicleId(vehicleId: string): Promise<Trip | null>;
  findManyPaginated(params: {
    status?: TripStatus;
    driverId?: string;
    vehicleId?: string;
    page: number;
    limit: number;
  }): Promise<{
    trips: Trip[];
    total: number;
  }>;
  save(trip: Trip): Promise<void>;
}