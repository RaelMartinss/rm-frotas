import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetDriverHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });

    if (!user || !user.driverProfile) {
      // Tenta buscar motorista por nome
      const driver = await this.prisma.driver.findFirst({
        where: {
          OR: [
            { userId },
            { name: { contains: user?.name, mode: 'insensitive' } },
          ],
        },
      });

      if (!driver) return [];

      return this.findDriverTrips(driver.id);
    }

    return this.findDriverTrips(user.driverProfile.id);
  }

  private async findDriverTrips(driverId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { driverId },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return trips.map((t) => ({
      id: t.id,
      status: t.status,
      origin: `${t.originCity} (${t.originState})`,
      destination: `${t.destinationCity} (${t.destinationState})`,
      vehicle: `${t.vehicle.brand ? t.vehicle.brand + ' ' : ''}${t.vehicle.model} (${t.vehicle.plate})`,
      startedAt: t.startedAt ? t.startedAt.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    }));
  }
}
