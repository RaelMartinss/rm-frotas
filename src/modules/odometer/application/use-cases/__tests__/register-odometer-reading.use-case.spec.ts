import { describe, expect, it, beforeEach } from 'vitest';
import { RegisterOdometerReadingUseCase } from '../register-odometer-reading.use-case';
import { InMemoryOdometerReadingsRepository } from '../../../infrastructure/repositories/in-memory-odometer-readings.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { OdometerSource } from '../../../domain/value-objects/odometer-source.vo';
import { OdometerRegressionException } from '../../../domain/exceptions/odometer-regression.exception';
import { NotFoundException } from '@nestjs/common';

describe('RegisterOdometerReadingUseCase', () => {
  let odometerRepo: InMemoryOdometerReadingsRepository;
  let vehiclesRepo: InMemoryVehiclesRepository;
  let useCase: RegisterOdometerReadingUseCase;
  let sampleVehicle: Vehicle;

  beforeEach(async () => {
    odometerRepo = new InMemoryOdometerReadingsRepository();
    vehiclesRepo = new InMemoryVehiclesRepository();
    useCase = new RegisterOdometerReadingUseCase(odometerRepo, vehiclesRepo);

    sampleVehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Hilux',
      brand: 'Toyota',
      year: 2023,
      currentKm: 50000,
      ownerId: 'owner-1',
      clientId: 'client-1',
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepo.save(sampleVehicle);
  });

  it('deve lançar NotFoundException se veículo não existir', async () => {
    await expect(
      useCase.execute({
        vehicleId: 'non-existent',
        clientId: 'client-1',
        ownerId: 'owner-1',
        currentKm: 51000,
        source: OdometerSource.FUEL,
        sourceId: 'fuel-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve registrar leitura válida e atualizar km do veículo', async () => {
    const reading = await useCase.execute({
      vehicleId: sampleVehicle.getId(),
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 50250,
      source: OdometerSource.FUEL,
      sourceId: 'fuel-1',
    });

    expect(reading).toBeDefined();
    expect(reading.getCurrentKm().getValue()).toBe(50250);
    expect(reading.getPreviousKm().getValue()).toBe(50000);
    expect(reading.getSource()).toBe(OdometerSource.FUEL);

    // Verifica se atualizou o veículo
    const updatedVehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(updatedVehicle?.getCurrentKm()).toBe(50250);
  });

  it('deve lançar OdometerRegressionException se nova leitura for menor que anterior', async () => {
    await expect(
      useCase.execute({
        vehicleId: sampleVehicle.getId(),
        clientId: 'client-1',
        ownerId: 'owner-1',
        currentKm: 49000,
        source: OdometerSource.TRIP,
        sourceId: 'trip-1',
      }),
    ).rejects.toBeInstanceOf(OdometerRegressionException);
  });

  it('deve manter o previousKm baseado na última leitura gravada se houver', async () => {
    await useCase.execute({
      vehicleId: sampleVehicle.getId(),
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 50300,
      source: OdometerSource.TRIP,
      sourceId: 'trip-1',
    });

    const secondReading = await useCase.execute({
      vehicleId: sampleVehicle.getId(),
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 50600,
      source: OdometerSource.MAINTENANCE,
      sourceId: 'maint-1',
    });

    expect(secondReading.getPreviousKm().getValue()).toBe(50300);
    expect(secondReading.getCurrentKm().getValue()).toBe(50600);
  });
});
