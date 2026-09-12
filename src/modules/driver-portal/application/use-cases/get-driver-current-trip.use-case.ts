import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface DriverCurrentTripOutput {
  driver: {
    id: string;
    name: string;
    cpf: string;
    cnhNumber: string;
    cnhCategory: string;
    cnhExpirationDate: string;
    cnhExpirationDateIso: string;
    daysUntilCnhExpires: number;
    isCnhExpired: boolean;
    canStartTrip: boolean;
    status: string;
  } | null;
  trip: {
    id: string;
    status: string;
    originAddress: string;
    originCity: string;
    originState: string;
    destinationAddress: string;
    destinationCity: string;
    destinationState: string;
    startedAt: string | null;
    createdAt: string;
    vehicle: {
      id: string;
      brand: string | null;
      model: string;
      plate: string;
      year: number;
      currentKm: number;
      crlvExpiration: string | null;
      status: string;
    };
  } | null;
  recentTripsCount: number;
  pendingReceiptsCount: number;
}

@Injectable()
export class GetDriverCurrentTripUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, clientId?: string | null): Promise<DriverCurrentTripOutput> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário motorista não encontrado.');
    }

    // 1. Localiza o perfil de motorista vinculado (pelo userId ou pelo nome no mesmo tenant)
    let driver = user.driverProfile;
    if (!driver && clientId) {
      driver = await this.prisma.driver.findFirst({
        where: {
          clientId,
          OR: [
            { userId: user.id },
            { name: { contains: user.name, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!driver && !clientId) {
      driver = await this.prisma.driver.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { name: { contains: user.name, mode: 'insensitive' } },
          ],
        },
      });
    }

    // Se ainda não houver driver cadastrado, retorna driver com dados do user
    const now = new Date();
    const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDate = driver
      ? new Date(
          driver.cnhExpirationDate.getFullYear(),
          driver.cnhExpirationDate.getMonth(),
          driver.cnhExpirationDate.getDate(),
        )
      : null;
    const daysUntilCnhExpires = expDate
      ? Math.round((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const isCnhExpired = daysUntilCnhExpires < 0;
    const canStartTrip = driver
      ? driver.status === 'ACTIVE' && daysUntilCnhExpires > 1
      : false;

    const driverData = driver
      ? {
          id: driver.id,
          name: driver.name,
          cpf: driver.cpf,
          cnhNumber: driver.cnhNumber,
          cnhCategory: driver.cnhCategory,
          cnhExpirationDate: driver.cnhExpirationDate.toLocaleDateString('pt-BR'),
          cnhExpirationDateIso: driver.cnhExpirationDate.toISOString(),
          daysUntilCnhExpires,
          isCnhExpired,
          canStartTrip,
          status: driver.status,
        }
      : null;

    if (!driver) {
      return {
        driver: null,
        trip: null,
        recentTripsCount: 0,
        pendingReceiptsCount: 0,
      };
    }

    // 2. Busca viagem em andamento (IN_PROGRESS) ou agendada (PLANNED)
    const activeTrip = await this.prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['IN_PROGRESS', 'PLANNED'] },
      },
      include: {
        vehicle: true,
      },
      orderBy: [
        // Prioriza IN_PROGRESS sobre PLANNED
        { status: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // 3. Contagens de viagens concluídas e abastecimentos com comprovante pendente
    const [recentTripsCount, pendingReceiptsCount] = await Promise.all([
      this.prisma.trip.count({
        where: {
          driverId: driver.id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.fuelRecord.count({
        where: {
          driverId: driver.id,
          OR: [{ receiptUrl: null }, { receiptUrl: '' }],
        },
      }),
    ]);

    return {
      driver: driverData,
      trip: activeTrip
        ? {
            id: activeTrip.id,
            status: activeTrip.status,
            originAddress: activeTrip.originAddress,
            originCity: activeTrip.originCity,
            originState: activeTrip.originState,
            destinationAddress: activeTrip.destinationAddress,
            destinationCity: activeTrip.destinationCity,
            destinationState: activeTrip.destinationState,
            startedAt: activeTrip.startedAt ? activeTrip.startedAt.toISOString() : null,
            createdAt: activeTrip.createdAt.toISOString(),
            vehicle: {
              id: activeTrip.vehicle.id,
              brand: activeTrip.vehicle.brand,
              model: activeTrip.vehicle.model,
              plate: activeTrip.vehicle.plate,
              renavam: activeTrip.vehicle.renavam ?? null,
              year: activeTrip.vehicle.year,
              currentKm: activeTrip.vehicle.currentKm,
              crlvExpiration: activeTrip.vehicle.crlvExpiration
                ? activeTrip.vehicle.crlvExpiration.toLocaleDateString('pt-BR')
                : null,
              status: activeTrip.vehicle.status,
            },
          }
        : null,
      recentTripsCount,
      pendingReceiptsCount,
    };
  }
}
