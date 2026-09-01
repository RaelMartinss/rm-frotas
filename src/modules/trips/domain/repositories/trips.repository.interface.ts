import { TripStatus } from '../entities/trip-status.enum';
import { Trip } from '../entities/trip.entity';

export interface FindManyPaginatedParams {
  status?: TripStatus;
  driverId?: string;
  vehicleId?: string;
  page: number;
  limit: number;
}

export interface FindManyPaginatedOutput {
  trips: Trip[];
  total: number;
}

export interface ITripsRepository {
  save(trip: Trip): Promise<void>;
  findById(id: string): Promise<Trip | null>;
  findManyPaginated(params: FindManyPaginatedParams): Promise<FindManyPaginatedOutput>;
}