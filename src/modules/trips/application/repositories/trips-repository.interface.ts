import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/entities/trip-status.enum';
import { TripWaypointInput } from '../use-cases/create-trip.dto';

export interface ITripsRepository {
  create(trip: Trip, waypoints?: TripWaypointInput[]): Promise<void>;
  findById(id: string): Promise<Trip | null>;
  findActiveByDriverId(driverId: string): Promise<Trip | null>;
  findActiveByVehicleId(vehicleId: string): Promise<Trip | null>;
  findManyPaginated(params: {
    status?: TripStatus;
    search?: string;
    driverId?: string;
    vehicleId?: string;
    ownerId?: string;
    clientId?: string;
    page: number;
    limit: number;
  }): Promise<{
    trips: Trip[];
    total: number;
  }>;
  findActiveTrips(params: {
    clientId?: string;
    ownerId?: string;
    excludeTripId?: string;
  }): Promise<Trip[]>;
  save(trip: Trip): Promise<void>;
}