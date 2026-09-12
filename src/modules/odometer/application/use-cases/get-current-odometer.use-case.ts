import { Injectable, NotFoundException } from '@nestjs/common';
import { IOdometerReadingsRepository } from '../../domain/repositories/odometer-reading.repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { OdometerReading } from '../../domain/entities/odometer-reading.entity';

export interface CurrentOdometerOutput {
  vehicleId: string;
  plate: string;
  currentKm: number;
  lastReading: OdometerReading | null;
}

@Injectable()
export class GetCurrentOdometerUseCase {
  constructor(
    private readonly odometerReadingsRepository: IOdometerReadingsRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute(vehicleId: string): Promise<CurrentOdometerOutput> {
    const vehicle = await this.vehiclesRepository.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Veículo ${vehicleId} não encontrado.`);
    }

    const lastReading = await this.odometerReadingsRepository.findLatestByVehicle(vehicleId);

    return {
      vehicleId: vehicle.getId(),
      plate: vehicle.getPlate().getValue(),
      currentKm: lastReading ? lastReading.getCurrentKm().getValue() : vehicle.getCurrentKm(),
      lastReading,
    };
  }
}
