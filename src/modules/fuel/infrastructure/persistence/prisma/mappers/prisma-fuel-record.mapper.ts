import { FuelRecord as PrismaFuelRecord, FuelType as PrismaFuelType } from '@prisma/client';
import { FuelRecord } from '../../../../domain/entities/fuel-record.entity';
import { FuelType } from '../../../../domain/enums/fuel-type.enum';
import { Money } from '../../../../../../shared/domain/value-objects/money.vo';
import { FuelRecordWithRelations } from '../../../../domain/repositories/fuel-records.repository';

export class PrismaFuelRecordMapper {
  static toDomain(raw: PrismaFuelRecord): FuelRecord {
    return new FuelRecord(
      {
        vehicleId: raw.vehicleId,
        driverId: raw.driverId,
        ownerId: raw.ownerId,
        fuelType: raw.fuelType as unknown as FuelType,
        liters: raw.liters,
        pricePerUnit: new Money(raw.pricePerUnit),
        totalCost: new Money(raw.totalCost),
        odometerAtFueling: raw.odometerAtFueling,
        gasStation: raw.gasStation,
        fullTank: raw.fullTank,
        receiptUrl: raw.receiptUrl,
        fueledAt: raw.fueledAt,
        notes: raw.notes,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id
    );
  }

  static toDomainWithRelations(
    raw: PrismaFuelRecord & {
      vehicle?: { id: string; plate: string; model: string; brand: string | null } | null;
      driver?: { id: string; name: string; cpf: string } | null;
    }
  ): FuelRecordWithRelations {
    const fuelRecord = this.toDomain(raw);

    return {
      fuelRecord,
      vehicle: raw.vehicle
        ? {
            id: raw.vehicle.id,
            plate: raw.vehicle.plate,
            model: raw.vehicle.model,
            brand: raw.vehicle.brand,
          }
        : undefined,
      driver: raw.driver
        ? {
            id: raw.driver.id,
            name: raw.driver.name,
            cpf: raw.driver.cpf,
          }
        : undefined,
    };
  }

  static toPrisma(fuelRecord: FuelRecord): PrismaFuelRecord {
    return {
      id: fuelRecord.getId(),
      vehicleId: fuelRecord.getVehicleId(),
      driverId: fuelRecord.getDriverId(),
      ownerId: fuelRecord.getOwnerId(),
      fuelType: fuelRecord.getFuelType() as unknown as PrismaFuelType,
      liters: fuelRecord.getLiters(),
      pricePerUnit: fuelRecord.getPricePerUnit().amount,
      totalCost: fuelRecord.getTotalCost().amount,
      odometerAtFueling: fuelRecord.getOdometerAtFueling(),
      gasStation: fuelRecord.getGasStation() ?? null,
      fullTank: fuelRecord.isFullTank(),
      receiptUrl: fuelRecord.getReceiptUrl() ?? null,
      fueledAt: fuelRecord.getFueledAt(),
      notes: fuelRecord.getNotes() ?? null,
      createdAt: fuelRecord.getCreatedAt(),
      updatedAt: fuelRecord.getUpdatedAt(),
    };
  }
}
