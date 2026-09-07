import { Maintenance } from '../../domain/entities/maintenance.entity';
import { MaintenanceStatus } from '../../domain/enums/maintenance-status.enum';
import { MaintenanceType } from '../../domain/enums/maintenance-type.enum';
import {
  FindManyMaintenancesPaginatedOutput,
  FindManyMaintenancesPaginatedParams,
  IMaintenancesRepository,
  MaintenanceStatsOutput,
  MaintenanceWithVehicleDetails,
} from '../../domain/repositories/maintenances.repository';

export class InMemoryMaintenancesRepository implements IMaintenancesRepository {
  public items: Maintenance[] = [];

  async save(maintenance: Maintenance): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === maintenance.getId());
    if (index >= 0) {
      this.items[index] = maintenance;
    } else {
      this.items.push(maintenance);
    }
  }

  async findById(id: string): Promise<Maintenance | null> {
    const item = this.items.find((m) => m.getId() === id);
    return item ?? null;
  }

  async findByIdWithVehicle(id: string): Promise<MaintenanceWithVehicleDetails | null> {
    const item = this.items.find((m) => m.getId() === id);
    if (!item) return null;
    return {
      maintenance: item,
      vehicle: {
        id: item.getVehicleId(),
        plate: 'ABC1D23',
        model: 'Corolla',
        brand: 'Toyota',
        currentKm: 50000,
      },
    };
  }

  async findActiveByVehicleId(vehicleId: string): Promise<Maintenance | null> {
    const item = this.items.find(
      (m) => m.getVehicleId() === vehicleId && m.getStatus() === MaintenanceStatus.EM_ANDAMENTO
    );
    return item ?? null;
  }

  async findManyPaginated({
    ownerId,
    vehicleId,
    status,
    type,
    from,
    to,
    page,
    limit,
  }: FindManyMaintenancesPaginatedParams): Promise<FindManyMaintenancesPaginatedOutput> {
    let filtered = this.items.filter((item) => item.getOwnerId() === ownerId);

    if (vehicleId) {
      filtered = filtered.filter((item) => item.getVehicleId() === vehicleId);
    }

    if (status) {
      filtered = filtered.filter((item) => item.getStatus() === status);
    }

    if (type) {
      filtered = filtered.filter((item) => item.getType() === type);
    }

    if (from) {
      filtered = filtered.filter((item) => item.getCreatedAt() >= from);
    }

    if (to) {
      filtered = filtered.filter((item) => item.getCreatedAt() <= to);
    }

    // Sort desc by createdAt
    filtered.sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      maintenances: paginatedItems.map((maintenance) => ({
        maintenance,
        vehicle: {
          id: maintenance.getVehicleId(),
          plate: 'ABC1D23',
          model: 'Corolla',
          brand: 'Toyota',
          currentKm: 50000,
        },
      })),
      total,
    };
  }

  async getStats(ownerId: string, from?: Date, to?: Date): Promise<MaintenanceStatsOutput> {
    let filtered = this.items.filter((item) => item.getOwnerId() === ownerId);

    if (from) {
      filtered = filtered.filter((item) => item.getCreatedAt() >= from);
    }

    if (to) {
      filtered = filtered.filter((item) => item.getCreatedAt() <= to);
    }

    let totalCost = 0;
    let preventiveCost = 0;
    let correctiveCost = 0;
    let scheduledCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let canceledCount = 0;

    for (const m of filtered) {
      const cost = m.getCost().amount;
      totalCost += cost;

      if (m.getType() === MaintenanceType.PREVENTIVA) {
        preventiveCost += cost;
      } else if (m.getType() === MaintenanceType.CORRETIVA) {
        correctiveCost += cost;
      }

      switch (m.getStatus()) {
        case MaintenanceStatus.AGENDADA:
          scheduledCount++;
          break;
        case MaintenanceStatus.EM_ANDAMENTO:
          inProgressCount++;
          break;
        case MaintenanceStatus.CONCLUIDA:
          completedCount++;
          break;
        case MaintenanceStatus.CANCELADA:
          canceledCount++;
          break;
      }
    }

    return {
      totalCost,
      totalMaintenances: filtered.length,
      scheduledCount,
      inProgressCount,
      completedCount,
      canceledCount,
      preventiveCost,
      correctiveCost,
    };
  }
}
