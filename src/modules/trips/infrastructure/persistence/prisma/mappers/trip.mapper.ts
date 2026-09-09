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
        clientId: raw.clientId,
        status: raw.status as TripStatus,
        origin,
        destination,
        scheduledDate: raw.scheduledDate ?? undefined,
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
    const clientId = trip.getClientId() ?? process.env.DEFAULT_CLIENT_ID;
    if (!clientId) {
      throw new Error(`Trip ${trip.getId()} must have a clientId to be persisted.`);
    }

    return {
      id: trip.getId(),
      driverId: trip.getDriverId(),
      vehicleId: trip.getVehicleId(),
      clientId,
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
      scheduledDate: trip.getScheduledDate() ?? null,
      startedAt: trip.getStartedAt() ?? null,
      completedAt: trip.getCompletedAt() ?? null,
      createdAt: trip.getCreatedAt(),
      updatedAt: trip.getUpdatedAt(),
    };
  }
}