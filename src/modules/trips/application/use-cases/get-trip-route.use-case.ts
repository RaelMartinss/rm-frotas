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
      driverName: trip.driver.name,
      vehiclePlate: trip.vehicle.plate,
      vehicleModel: trip.vehicle.model,
      originAddress: `${trip.originAddress}, ${trip.originCity} - ${trip.originState}`,
      destinationAddress: `${trip.destinationAddress}, ${trip.destinationCity} - ${trip.destinationState}`,
      startedAt: trip.startedAt,
      completedAt: trip.completedAt,
      pings: trip.locationPings.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        recordedAt: p.recordedAt,
        createdAt: p.createdAt,
      })),
    };
  }
}
