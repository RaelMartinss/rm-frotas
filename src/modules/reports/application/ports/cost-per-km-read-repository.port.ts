import { DateRange } from '../../domain/value-objects/date-range.vo';

export interface VehicleCostAggregate {
  vehicleId: string;
  plate: string;
  model: string;
  year: number;
  fuelCost: number;
  maintenanceCost: number;
  kmStart: number | null;
  kmEnd: number | null;
  validReadingsCount: number;
}

export interface CostPerKmReadRepository {
  findAggregates(params: {
    clientId: string;
    range: DateRange;
    vehicleId?: string;
  }): Promise<VehicleCostAggregate[]>;
}

export const COST_PER_KM_READ_REPOSITORY = Symbol('COST_PER_KM_READ_REPOSITORY');
