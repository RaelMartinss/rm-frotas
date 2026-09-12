import { Injectable, NotFoundException } from '@nestjs/common';
import { IOdometerReadingsRepository } from '../../domain/repositories/odometer-reading.repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { OdometerReading } from '../../domain/entities/odometer-reading.entity';
import { OdometerHistoryQueryDto } from '../dtos/odometer-history-query.dto';

export interface OdometerHistoryOutput {
  readings: OdometerReading[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class GetVehicleOdometerHistoryUseCase {
  constructor(
    private readonly odometerReadingsRepository: IOdometerReadingsRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute(query: OdometerHistoryQueryDto): Promise<OdometerHistoryOutput> {
    const vehicle = await this.vehiclesRepository.findById(query.vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Veículo ${query.vehicleId} não encontrado.`);
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const { readings, total } = await this.odometerReadingsRepository.findHistoryByVehicle({
      vehicleId: query.vehicleId,
      clientId: query.clientId,
      page,
      limit,
      source: query.source,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return {
      readings,
      total,
      page,
      limit,
    };
  }
}
