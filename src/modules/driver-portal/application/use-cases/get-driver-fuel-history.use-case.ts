import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface DriverFuelHistoryItem {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  fuelType: string;
  liters: number;
  pricePerUnit: number;
  totalCost: number;
  odometerAtFueling: number;
  gasStation: string | null;
  fullTank: boolean;
  receiptUrl: string | null;
  hasReceipt?: boolean;
  notes: string | null;
  fueledAt: string;
  isPendingReceipt: boolean;
  odometerInconsistent?: boolean;
}

@Injectable()
export class GetDriverFuelHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    pendingReceiptOnly = false,
    clientId?: string | null,
    omitReceipts = false,
  ): Promise<DriverFuelHistoryItem[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });

    if (!user) return [];

    let driverId = user.driverProfile?.id;
    const effectiveClientId = clientId ?? user.clientId ?? undefined;

    if (!driverId) {
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
      driverId = driver.id;
    }

    const where: any = { driverId };

    if (pendingReceiptOnly) {
      where.OR = [
        { receiptUrl: null },
        { receiptUrl: '' },
      ];
    }

    if (omitReceipts) {
      // Modo otimizado: evita ler até 50 blobs Base64 das tabelas TOAST do PostgreSQL e trafegá-los no 4G
      const lightRecords = await this.prisma.fuelRecord.findMany({
        where,
        select: {
          id: true,
          vehicleId: true,
          fuelType: true,
          liters: true,
          pricePerUnit: true,
          totalCost: true,
          odometerAtFueling: true,
          gasStation: true,
          fullTank: true,
          notes: true,
          fueledAt: true,
          odometerInconsistent: true,
          vehicle: {
            select: { plate: true, model: true, brand: true },
          },
        },
        orderBy: { fueledAt: 'desc' },
        take: 50,
      });

      if (lightRecords.length === 0) return [];

      let pendingIds = new Set<string>();
      if (pendingReceiptOnly) {
        pendingIds = new Set(lightRecords.map((r) => r.id));
      } else {
        const missingRows = await this.prisma.fuelRecord.findMany({
          where: {
            id: { in: lightRecords.map((r) => r.id) },
            OR: [{ receiptUrl: null }, { receiptUrl: '' }],
          },
          select: { id: true },
        });
        pendingIds = new Set(missingRows.map((m) => m.id));
      }

      return lightRecords.map((r) => {
        const isPending = pendingIds.has(r.id);
        return {
          id: r.id,
          vehicleId: r.vehicleId,
          vehiclePlate: r.vehicle.plate,
          vehicleModel: `${r.vehicle.brand ? r.vehicle.brand + ' ' : ''}${r.vehicle.model}`,
          fuelType: r.fuelType,
          liters: r.liters,
          pricePerUnit: r.pricePerUnit,
          totalCost: r.totalCost,
          odometerAtFueling: r.odometerAtFueling,
          gasStation: r.gasStation,
          fullTank: r.fullTank,
          receiptUrl: null,
          hasReceipt: !isPending,
          notes: r.notes,
          fueledAt: r.fueledAt.toISOString(),
          isPendingReceipt: isPending,
          odometerInconsistent: r.odometerInconsistent,
        };
      });
    }

    const records = await this.prisma.fuelRecord.findMany({
      where,
      include: {
        vehicle: {
          select: { plate: true, model: true, brand: true },
        },
      },
      orderBy: { fueledAt: 'desc' },
      take: 50,
    });

    return records.map((r) => {
      const hasReceipt = Boolean(r.receiptUrl && r.receiptUrl.trim().length > 0);
      return {
        id: r.id,
        vehicleId: r.vehicleId,
        vehiclePlate: r.vehicle.plate,
        vehicleModel: `${r.vehicle.brand ? r.vehicle.brand + ' ' : ''}${r.vehicle.model}`,
        fuelType: r.fuelType,
        liters: r.liters,
        pricePerUnit: r.pricePerUnit,
        totalCost: r.totalCost,
        odometerAtFueling: r.odometerAtFueling,
        gasStation: r.gasStation,
        fullTank: r.fullTank,
        receiptUrl: r.receiptUrl,
        hasReceipt,
        notes: r.notes,
        fueledAt: r.fueledAt.toISOString(),
        isPendingReceipt: !hasReceipt,
        odometerInconsistent: r.odometerInconsistent,
      };
    });
  }
}
