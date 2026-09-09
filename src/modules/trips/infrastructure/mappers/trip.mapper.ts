import { Trip as PrismaTrip, TripStatus as PrismaTripStatus } from '@prisma/client';
import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/entities/trip-status.enum';
import { Location } from '../../domain/value-objects/location.vo';

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
        origin,
        destination,
        status: TripStatus[raw.status as keyof typeof TripStatus],
        scheduledDate: raw.scheduledDate ?? undefined,
        startedAt: raw.startedAt,
        completedAt: raw.completedAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  static toPrisma(trip: Trip) {
    const clientId = trip.getClientId() ?? process.env.DEFAULT_CLIENT_ID;
    if (!clientId) {
      throw new Error(`Trip ${trip.getId()} must have a clientId to be persisted.`);
    }

    return {
      id: trip.getId(),
      driverId: trip.getDriverId(),
      vehicleId: trip.getVehicleId(),
      clientId,
      originAddress: trip.getOrigin().getAddress(),
      originCity: trip.getOrigin().getCity(),
      originState: trip.getOrigin().getState(),
      originLatitude: trip.getOrigin().getLatitude() ?? null,
      originLongitude: trip.getOrigin().getLongitude() ?? null,
      destinationAddress: trip.getDestination().getAddress(),
      destinationCity: trip.getDestination().getCity(),
      destinationState: trip.getDestination().getState(),
      destinationLatitude: trip.getDestination().getLatitude() ?? null,
      destinationLongitude: trip.getDestination().getLongitude() ?? null,
      status: trip.getStatus() as PrismaTripStatus,
      scheduledDate: trip.getScheduledDate() ?? null,
      startedAt: trip.getStartedAt() ?? null,
      completedAt: trip.getCompletedAt() ?? null,
      createdAt: trip.getCreatedAt(),
      updatedAt: trip.getUpdatedAt(),
    };
  }
}