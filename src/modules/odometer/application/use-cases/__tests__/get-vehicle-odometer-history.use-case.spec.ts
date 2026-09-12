import { describe, expect, it, beforeEach } from 'vitest';
import { GetVehicleOdometerHistoryUseCase } from '../get-vehicle-odometer-history.use-case';
import { InMemoryOdometerReadingsRepository } from '../../../infrastructure/repositories/in-memory-odometer-readings.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { OdometerReading } from '../../../domain/entities/odometer-reading.entity';
import { OdometerSource } from '../../../domain/value-objects/odometer-source.vo';
import { NotFoundException } from '@nestjs/common';

describe('GetVehicleOdometerHistoryUseCase', () => {
  let odometerRepo: InMemoryOdometerReadingsRepository;
  let vehiclesRepo: InMemoryVehiclesRepository;
  let useCase: GetVehicleOdometerHistoryUseCase;
  let sampleVehicle: Vehicle;

  beforeEach(async () => {
    odometerRepo = new InMemoryOdometerReadingsRepository();
    vehiclesRepo = new InMemoryVehiclesRepository();
    useCase = new GetVehicleOdometerHistoryUseCase(odometerRepo, vehiclesRepo);

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

    // Grava 3 leituras
    await odometerRepo.save(
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: sampleVehicle.getId(),
        ownerId: 'owner-1',
        previousKm: 48000,
        currentKm: 49000,
        source: OdometerSource.TRIP,
        sourceId: 'trip-1',
        recordedAt: new Date('2026-09-10T10:00:00Z'),
      }),
    );

    await odometerRepo.save(
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: sampleVehicle.getId(),
        ownerId: 'owner-1',
        previousKm: 49000,
        currentKm: 49500,
        source: OdometerSource.FUEL,
        sourceId: 'fuel-1',
        recordedAt: new Date('2026-09-11T10:00:00Z'),
      }),
    );

    await odometerRepo.save(
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: sampleVehicle.getId(),
        ownerId: 'owner-1',
        previousKm: 49500,
        currentKm: 50000,
        source: OdometerSource.MAINTENANCE,
        sourceId: 'maint-1',
        recordedAt: new Date('2026-09-12T10:00:00Z'),
      }),
    );
  });

  it('deve lançar NotFoundException se veículo não existir', async () => {
    await expect(
      useCase.execute({
        vehicleId: 'non-existent',
        clientId: 'client-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve listar o histórico de odômetro ordenado por data decrescente', async () => {
    const result = await useCase.execute({
      vehicleId: sampleVehicle.getId(),
      clientId: 'client-1',
    });

    expect(result.total).toBe(3);
    expect(result.readings.length).toBe(3);
    expect(result.readings[0].getCurrentKm().getValue()).toBe(50000);
    expect(result.readings[1].getCurrentKm().getValue()).toBe(49500);
    expect(result.readings[2].getCurrentKm().getValue()).toBe(49000);
  });

  it('deve filtrar por source', async () => {
    const result = await useCase.execute({
      vehicleId: sampleVehicle.getId(),
      clientId: 'client-1',
      source: OdometerSource.FUEL,
    });

    expect(result.total).toBe(1);
    expect(result.readings[0].getSource()).toBe(OdometerSource.FUEL);
  });
});
