import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface GetTripRouteInput {
  tripId: string;
  clientId?: string;
  ownerId?: string;
}

@Injectable()
export class GetTripRouteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ tripId, clientId, ownerId }: GetTripRouteInput) {
    const where: any = { id: tripId };

    if (clientId) {
      where.clientId = clientId;
    } else if (ownerId) {
      where.OR = [
        { clientId: ownerId },
        { vehicle: { ownerId } },
        { driver: { ownerId } },
      ];
    }

    const trip = await this.prisma.trip.findFirst({
      where,
      include: {
        driver: true,
        vehicle: true,
        locationPings: {
          orderBy: {
            recordedAt: 'asc',
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    return {
      tripId: trip.id,
      status: trip.status,
      driverId: trip.driver.id,
      driverName: trip.driver.name,
      driverPhone: trip.driver.phone || null,
      driverCnh: trip.driver.cnhNumber || null,
      driverPhotoUrl: trip.driver.photoUrl || null,
      vehicleId: trip.vehicle.id,
      vehiclePlate: trip.vehicle.plate,
      vehicleModel: trip.vehicle.model,
      vehicleBrand: trip.vehicle.brand || null,
      vehicleCurrentKm: trip.vehicle.currentKm,
      origin: trip.originAddress,
      originCity: trip.originCity,
      originState: trip.originState,
      originAddress: `${trip.originAddress}, ${trip.originCity} - ${trip.originState}`,
      destination: trip.destinationAddress,
      destinationCity: trip.destinationCity,
      destinationState: trip.destinationState,
      destinationAddress: `${trip.destinationAddress}, ${trip.destinationCity} - ${trip.destinationState}`,
      scheduledDate: trip.scheduledDate,
      estimatedArrivalDate: trip.estimatedArrivalDate,
      startedAt: trip.startedAt,
      completedAt: trip.completedAt,
      createdAt: trip.createdAt,
      pings: trip.locationPings.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        speed: p.speed,
        heading: p.heading,
        movementState: p.movementState,
        matchedLatitude: p.matchedLatitude,
        matchedLongitude: p.matchedLongitude,
        recordedAt: p.recordedAt,
        createdAt: p.createdAt,
      })),
    };
  }
}
