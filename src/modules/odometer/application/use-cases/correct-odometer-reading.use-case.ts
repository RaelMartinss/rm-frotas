import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IOdometerReadingsRepository } from '../../domain/repositories/odometer-reading.repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { OdometerReading } from '../../domain/entities/odometer-reading.entity';
import { OdometerSource } from '../../domain/value-objects/odometer-source.vo';
import { CorrectOdometerReadingDto } from '../dtos/correct-odometer-reading.dto';

@Injectable()
export class CorrectOdometerReadingUseCase {
  constructor(
    private readonly odometerReadingsRepository: IOdometerReadingsRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute(dto: CorrectOdometerReadingDto): Promise<OdometerReading> {
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
      source: OdometerSource.MANUAL,
      sourceId: `manual-correction-${randomUUID()}`,
      correctedFromId: latestReading ? latestReading.getId() : null,
      reason: dto.reason,
      recordedAt: dto.recordedAt ?? new Date(),
    });

    await this.odometerReadingsRepository.save(reading);

    // Ajusta diretamente o km do veículo
    vehicle.correctKm(reading.getCurrentKm().getValue());
    await this.vehiclesRepository.save(vehicle);

    return reading;
  }
}
