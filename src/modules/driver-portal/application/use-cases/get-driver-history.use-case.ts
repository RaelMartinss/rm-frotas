import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetDriverHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, clientId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });

    if (!user) return [];

    const effectiveClientId = clientId ?? user.clientId ?? undefined;

    if (!user.driverProfile) {
      // Busca motorista restrito ao mesmo tenant (clientId) para evitar colisão de homônimos
      const driver = await this.prisma.driver.findFirst({
        where: {
          ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
          OR: [
            { userId },
            ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
            { userId: null, name: { equals: user.name, mode: 'insensitive' as const } },
          ],
        },
      });

      if (!driver) return [];

      if (!driver.userId && this.prisma.driver?.update) {
        await this.prisma.driver
          .update({ where: { id: driver.id }, data: { userId } })
          .catch(() => {});
      }

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
      scheduledDate: t.scheduledDate ? t.scheduledDate.toISOString() : null,
      startedAt: t.startedAt ? t.startedAt.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    }));
  }
}
