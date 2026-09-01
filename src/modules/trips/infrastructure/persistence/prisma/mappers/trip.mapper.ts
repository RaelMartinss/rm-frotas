import { Trip as PrismaTrip } from '@prisma/client';
import { Trip } from '../../../../domain/entities/trip.entity';
import { TripStatus } from '../../../../domain/entities/trip-status.enum';
import { Location } from '../../../../domain/value-objects/location.vo';

export class TripMapper {
  static toDomain(raw: PrismaTrip): Trip {
    const origin = new Location({
      address: raw.originAddress,
      city: raw.originCity,
      state: raw.originState,
      latitude: raw.originLatitude ?? undefined,
      longitude: raw.originLongitude ?? undefined,
    });

    const destination = new Location({
      address: raw.destinationAddress,
      city: raw.destinationCity,
      state: raw.destinationState,
      latitude: raw.destinationLatitude ?? undefined,
      longitude: raw.destinationLongitude ?? undefined,
    });

    return new Trip(
      {
        driverId: raw.driverId,
        vehicleId: raw.vehicleId,
        status: raw.status as TripStatus,
        origin,
        destination,
        startedAt: raw.startedAt ?? undefined,
        completedAt: raw.completedAt ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  static toPrisma(trip: Trip) {
    const origin = trip.getOrigin();
    const destination = trip.getDestination();

    return {
      id: trip.getId(),
      driverId: trip.getDriverId(),
      vehicleId: trip.getVehicleId(),
      originAddress: origin.getAddress(),
      originCity: origin.getCity(),
      originState: origin.getState(),
      originLatitude: origin.getLatitude() ?? null,
      originLongitude: origin.getLongitude() ?? null,
      destinationAddress: destination.getAddress(),
      destinationCity: destination.getCity(),
      destinationState: destination.getState(),
      destinationLatitude: destination.getLatitude() ?? null,
      destinationLongitude: destination.getLongitude() ?? null,
      status: trip.getStatus(),
      startedAt: trip.getStartedAt() ?? null,
      completedAt: trip.getCompletedAt() ?? null,
      createdAt: trip.getCreatedAt(),
      updatedAt: trip.getUpdatedAt(),
    };
  }
}