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
  notes: string | null;
  fueledAt: string;
  isPendingReceipt: boolean;
}

@Injectable()
export class GetDriverFuelHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, pendingReceiptOnly = false): Promise<DriverFuelHistoryItem[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });

    let driverId = user?.driverProfile?.id;

    if (!driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: {
          OR: [
            { userId },
            { name: { contains: user?.name, mode: 'insensitive' } },
          ],
        },
      });

      if (!driver) return [];
      driverId = driver.id;
    }

    const where: any = { driverId };

    if (pendingReceiptOnly) {
      where.OR = [
        { receiptUrl: null },
        { receiptUrl: '' },
      ];
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
        notes: r.notes,
        fueledAt: r.fueledAt.toISOString(),
        isPendingReceipt: !hasReceipt,
      };
    });
  }
}
