import { Injectable } from '@nestjs/common';
import {
  IFuelRecordsRepository,
  FindManyFuelRecordsOutput,
} from '../../domain/repositories/fuel-records.repository';
import { FuelType } from '../../domain/enums/fuel-type.enum';

export interface ListFuelRecordsInput {
  ownerId: string;
  callerDriverId?: string; // Se o usuário logado for MOTORISTA
  vehicleId?: string;
  driverId?: string;
  fuelType?: FuelType;
  fullTank?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListFuelRecordsUseCase {
  constructor(private readonly fuelRecordsRepository: IFuelRecordsRepository) {}

  async execute(input: ListFuelRecordsInput): Promise<FindManyFuelRecordsOutput> {
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 10));

    // Se o usuário logado for DRIVER, forçamos o filtro pelo seu próprio driverId
    const effectiveDriverId = input.callerDriverId ?? input.driverId;

    return this.fuelRecordsRepository.findManyPaginated({
      ownerId: input.ownerId,
      vehicleId: input.vehicleId,
      driverId: effectiveDriverId,
      fuelType: input.fuelType,
      fullTank: input.fullTank,
      startDate: input.startDate,
      endDate: input.endDate,
      search: input.search,
      page,
      limit,
    });
  }
}
