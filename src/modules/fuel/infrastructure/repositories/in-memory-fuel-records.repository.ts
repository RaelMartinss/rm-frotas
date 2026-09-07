import {
  IFuelRecordsRepository,
  FindManyFuelRecordsParams,
  FindManyFuelRecordsOutput,
  FuelRecordWithRelations,
  FuelAggregatedStats,
} from '../../domain/repositories/fuel-records.repository';
import { FuelRecord } from '../../domain/entities/fuel-record.entity';
import { FuelType } from '../../domain/enums/fuel-type.enum';

export class InMemoryFuelRecordsRepository implements IFuelRecordsRepository {
  public items: FuelRecord[] = [];

  async save(fuelRecord: FuelRecord): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === fuelRecord.getId());
    if (index >= 0) {
      this.items[index] = fuelRecord;
    } else {
      this.items.push(fuelRecord);
    }
  }

  async findById(id: string): Promise<FuelRecord | null> {
    const found = this.items.find((item) => item.getId() === id);
    return found ?? null;
  }

  async findByIdWithRelations(id: string): Promise<FuelRecordWithRelations | null> {
    const record = await this.findById(id);
    if (!record) return null;

    return {
      fuelRecord: record,
      vehicle: {
        id: record.getVehicleId(),
        plate: 'ABC1D23',
        model: 'Sprinter 415',
        brand: 'Mercedes-Benz',
      },
      driver: {
        id: record.getDriverId(),
        name: 'Carlos da Silva',
        cpf: '12345678901',
      },
    };
  }

  async findManyPaginated(params: FindManyFuelRecordsParams): Promise<FindManyFuelRecordsOutput> {
    let filtered = this.items.filter((item) => item.getOwnerId() === params.ownerId);

    if (params.vehicleId) {
      filtered = filtered.filter((item) => item.getVehicleId() === params.vehicleId);
    }

    if (params.driverId) {
      filtered = filtered.filter((item) => item.getDriverId() === params.driverId);
    }

    if (params.fuelType) {
      filtered = filtered.filter((item) => item.getFuelType() === params.fuelType);
    }

    if (params.fullTank !== undefined) {
      filtered = filtered.filter((item) => item.isFullTank() === params.fullTank);
    }

    if (params.startDate) {
      filtered = filtered.filter((item) => item.getFueledAt() >= params.startDate!);
    }

    if (params.endDate) {
      filtered = filtered.filter((item) => item.getFueledAt() <= params.endDate!);
    }

    filtered.sort((a, b) => b.getFueledAt().getTime() - a.getFueledAt().getTime());

    const total = filtered.length;
    const skip = (params.page - 1) * params.limit;
    const paginated = filtered.slice(skip, skip + params.limit);

    return {
      records: paginated.map((r) => ({
        fuelRecord: r,
        vehicle: {
          id: r.getVehicleId(),
          plate: 'ABC1D23',
          model: 'Sprinter 415',
          brand: 'Mercedes-Benz',
        },
        driver: {
          id: r.getDriverId(),
          name: 'Carlos da Silva',
          cpf: '12345678901',
        },
      })),
      total,
    };
  }

  async findLastByVehicle(vehicleId: string): Promise<FuelRecord | null> {
    const vehicleRecords = this.items
      .filter((item) => item.getVehicleId() === vehicleId)
      .sort((a, b) => b.getFueledAt().getTime() - a.getFueledAt().getTime());

    return vehicleRecords[0] ?? null;
  }

  async findAllByVehicleChronological(
    vehicleId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelRecord[]> {
    let records = this.items.filter((item) => item.getVehicleId() === vehicleId);

    if (startDate) {
      records = records.filter((item) => item.getFueledAt() >= startDate);
    }

    if (endDate) {
      records = records.filter((item) => item.getFueledAt() <= endDate);
    }

    records.sort((a, b) => a.getFueledAt().getTime() - b.getFueledAt().getTime());
    return records;
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.getId() !== id);
  }

  async getAggregatedStats(
    ownerId: string,
    params?: { vehicleId?: string; driverId?: string; startDate?: Date; endDate?: Date }
  ): Promise<FuelAggregatedStats> {
    let records = this.items.filter((item) => item.getOwnerId() === ownerId);

    if (params?.vehicleId) {
      records = records.filter((item) => item.getVehicleId() === params.vehicleId);
    }

    if (params?.driverId) {
      records = records.filter((item) => item.getDriverId() === params.driverId);
    }

    if (params?.startDate) {
      records = records.filter((item) => item.getFueledAt() >= params.startDate!);
    }

    if (params?.endDate) {
      records = records.filter((item) => item.getFueledAt() <= params.endDate!);
    }

    const totalCost = records.reduce((sum, r) => sum + r.getTotalCost().amount, 0);
    const totalLiters = records.reduce((sum, r) => sum + r.getLiters(), 0);
    const totalRecords = records.length;
    const averagePricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    const byTypeMap = new Map<FuelType, { totalCost: number; totalLiters: number }>();
    for (const r of records) {
      const current = byTypeMap.get(r.getFuelType()) ?? { totalCost: 0, totalLiters: 0 };
      byTypeMap.set(r.getFuelType(), {
        totalCost: current.totalCost + r.getTotalCost().amount,
        totalLiters: current.totalLiters + r.getLiters(),
      });
    }

    const costByFuelType = Array.from(byTypeMap.entries()).map(([fuelType, data]) => ({
      fuelType,
      totalCost: Math.round(data.totalCost * 100) / 100,
      totalLiters: Math.round(data.totalLiters * 100) / 100,
    }));

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalRecords,
      averagePricePerLiter: Math.round(averagePricePerLiter * 100) / 100,
      costByFuelType,
    };
  }
}
