import { Injectable, NotFoundException } from '@nestjs/common';
import { IOdometerReadingsRepository } from '../../domain/repositories/odometer-reading.repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { OdometerReading } from '../../domain/entities/odometer-reading.entity';
import { RegisterOdometerReadingDto } from '../dtos/register-odometer-reading.dto';

@Injectable()
export class RegisterOdometerReadingUseCase {
  constructor(
    private readonly odometerReadingsRepository: IOdometerReadingsRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute(dto: RegisterOdometerReadingDto): Promise<OdometerReading> {
    const vehicle = await this.vehiclesRepository.findById(dto.vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Veículo ${dto.vehicleId} não encontrado.`);
    }

    const latestReading = await this.odometerReadingsRepository.findLatestByVehicle(dto.vehicleId);
    const previousKm = latestReading
      ? latestReading.getCurrentKm().getValue()
      : vehicle.getCurrentKm();

    const reading = OdometerReading.create({
      clientId: dto.clientId,
      vehicleId: dto.vehicleId,
      ownerId: dto.ownerId,
      previousKm,
      currentKm: dto.currentKm,
      source: dto.source,
      sourceId: dto.sourceId,
      recordedAt: dto.recordedAt ?? new Date(),
    });

    await this.odometerReadingsRepository.save(reading);

    if (reading.getCurrentKm().getValue() > vehicle.getCurrentKm()) {
      vehicle.updateKm(reading.getCurrentKm().getValue());
      await this.vehiclesRepository.save(vehicle);
    }

    return reading;
  }
}
