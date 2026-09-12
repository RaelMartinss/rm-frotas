import {
  IOdometerReadingsRepository,
  FindOdometerHistoryParams,
} from '../../domain/repositories/odometer-reading.repository.interface';
import { OdometerReading } from '../../domain/entities/odometer-reading.entity';

export class InMemoryOdometerReadingsRepository implements IOdometerReadingsRepository {
  public items: OdometerReading[] = [];

  async save(reading: OdometerReading): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === reading.getId());
    if (index >= 0) {
      this.items[index] = reading;
    } else {
      this.items.push(reading);
    }
  }

  async findLatestByVehicle(vehicleId: string): Promise<OdometerReading | null> {
    const readings = this.items
      .filter((item) => item.getVehicleId() === vehicleId)
      .sort((a, b) => b.getRecordedAt().getTime() - a.getRecordedAt().getTime());
    return readings.length > 0 ? readings[0] : null;
  }

  async findById(id: string): Promise<OdometerReading | null> {
    const reading = this.items.find((item) => item.getId() === id);
    return reading || null;
  }

  async findHistoryByVehicle(
    params: FindOdometerHistoryParams,
  ): Promise<{ readings: OdometerReading[]; total: number }> {
    let filtered = this.items.filter((item) => {
      if (item.getVehicleId() !== params.vehicleId) return false;
      if (params.clientId && item.getClientId() !== params.clientId) return false;
      if (params.source && item.getSource() !== params.source) return false;
      if (params.startDate && item.getRecordedAt() < params.startDate) return false;
      if (params.endDate && item.getRecordedAt() > params.endDate) return false;
      return true;
    });

    filtered.sort((a, b) => b.getRecordedAt().getTime() - a.getRecordedAt().getTime());

    const total = filtered.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const readings = filtered.slice(start, start + limit);

    return { readings, total };
  }
}
