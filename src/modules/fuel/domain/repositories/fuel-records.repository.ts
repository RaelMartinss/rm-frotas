import { FuelRecord } from '../entities/fuel-record.entity';
import { FuelType } from '../enums/fuel-type.enum';

export interface FuelRecordVehicleSummary {
  id: string;
  plate: string;
  model: string;
  brand?: string | null;
}

export interface FuelRecordDriverSummary {
  id: string;
  name: string;
  cpf: string;
}

export interface FuelRecordWithRelations {
  fuelRecord: FuelRecord;
  vehicle?: FuelRecordVehicleSummary;
  driver?: FuelRecordDriverSummary;
}

export interface FindManyFuelRecordsParams {
  ownerId: string;
  vehicleId?: string;
  driverId?: string;
  fuelType?: FuelType;
  fullTank?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page: number;
  limit: number;
}

export interface FindManyFuelRecordsOutput {
  records: FuelRecordWithRelations[];
  total: number;
}

export interface FuelAggregatedStats {
  totalCost: number;
  totalLiters: number;
  totalRecords: number;
  averagePricePerLiter: number;
  costByFuelType: { fuelType: FuelType; totalCost: number; totalLiters: number }[];
}

export abstract class IFuelRecordsRepository {
  abstract save(fuelRecord: FuelRecord): Promise<void>;
  abstract findById(id: string): Promise<FuelRecord | null>;
  abstract findByIdWithRelations(id: string): Promise<FuelRecordWithRelations | null>;
  abstract findManyPaginated(params: FindManyFuelRecordsParams): Promise<FindManyFuelRecordsOutput>;
  abstract findLastByVehicle(vehicleId: string): Promise<FuelRecord | null>;
  abstract findAllByVehicleChronological(
    vehicleId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FuelRecord[]>;
  abstract delete(id: string): Promise<void>;
  abstract getAggregatedStats(
    ownerId: string,
    params?: { vehicleId?: string; driverId?: string; startDate?: Date; endDate?: Date }
  ): Promise<FuelAggregatedStats>;
}
