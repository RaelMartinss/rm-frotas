import { describe, expect, it, beforeEach } from 'vitest';
import { GetCurrentOdometerUseCase } from '../get-current-odometer.use-case';
import { InMemoryOdometerReadingsRepository } from '../../../infrastructure/repositories/in-memory-odometer-readings.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { OdometerReading } from '../../../domain/entities/odometer-reading.entity';
import { OdometerSource } from '../../../domain/value-objects/odometer-source.vo';
import { NotFoundException } from '@nestjs/common';

describe('GetCurrentOdometerUseCase', () => {
  let odometerRepo: InMemoryOdometerReadingsRepository;
  let vehiclesRepo: InMemoryVehiclesRepository;
  let useCase: GetCurrentOdometerUseCase;
  let sampleVehicle: Vehicle;

  beforeEach(async () => {
    odometerRepo = new InMemoryOdometerReadingsRepository();
    vehiclesRepo = new InMemoryVehiclesRepository();
    useCase = new GetCurrentOdometerUseCase(odometerRepo, vehiclesRepo);

    sampleVehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Hilux',
      brand: 'Toyota',
      year: 2023,
      currentKm: 30000,
      ownerId: 'owner-1',
      clientId: 'client-1',
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepo.save(sampleVehicle);
  });

  it('deve lançar NotFoundException se veículo não existir', async () => {
    await expect(useCase.execute('non-existent')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve retornar currentKm do veículo quando ainda não há leituras', async () => {
    const result = await useCase.execute(sampleVehicle.getId());

    expect(result.vehicleId).toBe(sampleVehicle.getId());
    expect(result.plate).toBe('ABC1D23');
    expect(result.currentKm).toBe(30000);
    expect(result.lastReading).toBeNull();
  });

  it('deve retornar última leitura quando houver histórico', async () => {
    await odometerRepo.save(
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: sampleVehicle.getId(),
        ownerId: 'owner-1',
        previousKm: 30000,
        currentKm: 31200,
        source: OdometerSource.FUEL,
        sourceId: 'fuel-1',
        recordedAt: new Date('2026-09-12T10:00:00Z'),
      }),
    );

    const result = await useCase.execute(sampleVehicle.getId());

    expect(result.currentKm).toBe(31200);
    expect(result.lastReading).not.toBeNull();
    expect(result.lastReading?.getCurrentKm().getValue()).toBe(31200);
  });
});
