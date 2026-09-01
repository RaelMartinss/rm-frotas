import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/entities/trip-status.enum';
import { ITripsRepository } from '../../application/repositories/trips-repository.interface';
import { FindManyPaginatedOutput, FindManyPaginatedParams } from '../../domain/repositories/trips.repository.interface';

export class InMemoryTripsRepository implements ITripsRepository {
  public items: Trip[] = [];

  async create(trip: Trip): Promise<void> {
    this.items.push(trip);
  }

  async findById(id: string): Promise<Trip | null> {
    const trip = this.items.find((item) => item.getId() === id);
    return trip ?? null;
  }

  async findActiveByDriverId(driverId: string): Promise<Trip | null> {
    const trip = this.items.find((item) => {
      const isSameDriver = item.getDriverId() === driverId;
      const isActive =
        item.getStatus() === TripStatus.PLANNED ||
        item.getStatus() === TripStatus.IN_PROGRESS;

      return isSameDriver && isActive;
    });

    return trip ?? null;
  }

  async findActiveByVehicleId(vehicleId: string): Promise<Trip | null> {
    const trip = this.items.find((item) => {
      const isSameVehicle = item.getVehicleId() === vehicleId;
      const isActive =
        item.getStatus() === TripStatus.PLANNED ||
        item.getStatus() === TripStatus.IN_PROGRESS;

      return isSameVehicle && isActive;
    });

    return trip ?? null;
  }

  async save(trip: Trip): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === trip.getId());

    if (index >= 0) {
      this.items[index] = trip;
    } else {
      this.items.push(trip);
    }
  }

  async findManyPaginated({
    status,
    driverId,
    vehicleId,
    page,
    limit,
  }: FindManyPaginatedParams): Promise<FindManyPaginatedOutput> {
    let filteredTrips = this.items;

    if (status) {
      filteredTrips = filteredTrips.filter((trip) => trip.getStatus() === status);
    }
    if (driverId) {
      filteredTrips = filteredTrips.filter((trip) => trip.getDriverId() === driverId);
    }
    if (vehicleId) {
      filteredTrips = filteredTrips.filter((trip) => trip.getVehicleId() === vehicleId);
    }

    const total = filteredTrips.length;
    const startIndex = (page - 1) * limit;
    const paginatedTrips = filteredTrips.slice(startIndex, startIndex + limit);

    return {
      trips: paginatedTrips,
      total,
    };
  }
}