import { describe, expect, it, beforeEach } from 'vitest';
import { CorrectOdometerReadingUseCase } from '../correct-odometer-reading.use-case';
import { InMemoryOdometerReadingsRepository } from '../../../infrastructure/repositories/in-memory-odometer-readings.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { OdometerSource } from '../../../domain/value-objects/odometer-source.vo';
import { NotFoundException } from '@nestjs/common';

describe('CorrectOdometerReadingUseCase', () => {
  let odometerRepo: InMemoryOdometerReadingsRepository;
  let vehiclesRepo: InMemoryVehiclesRepository;
  let useCase: CorrectOdometerReadingUseCase;
  let sampleVehicle: Vehicle;

  beforeEach(async () => {
    odometerRepo = new InMemoryOdometerReadingsRepository();
    vehiclesRepo = new InMemoryVehiclesRepository();
    useCase = new CorrectOdometerReadingUseCase(odometerRepo, vehiclesRepo);

    sampleVehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Hilux',
      brand: 'Toyota',
      year: 2023,
      currentKm: 55000,
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
        currentKm: 50000,
        reason: 'Correção de digitação errada',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve lançar erro se justificativa (reason) for vazia', async () => {
    await expect(
      useCase.execute({
        vehicleId: sampleVehicle.getId(),
        clientId: 'client-1',
        ownerId: 'owner-1',
        currentKm: 50000,
        reason: '   ',
      }),
    ).rejects.toThrow('Justificativa é obrigatória para correções manuais de odômetro.');
  });

  it('deve permitir regressão quando source for MANUAL com justificativa e atualizar veículo', async () => {
    const reading = await useCase.execute({
      vehicleId: sampleVehicle.getId(),
      clientId: 'client-1',
      ownerId: 'owner-1',
      currentKm: 52000,
      reason: 'Motorista digitou 55000 em vez de 52000 no abastecimento anterior',
    });

    expect(reading.getSource()).toBe(OdometerSource.MANUAL);
    expect(reading.getCurrentKm().getValue()).toBe(52000);
    expect(reading.getPreviousKm().getValue()).toBe(55000);
    expect(reading.getReason()).toBe('Motorista digitou 55000 em vez de 52000 no abastecimento anterior');

    const updatedVehicle = await vehiclesRepo.findById(sampleVehicle.getId());
    expect(updatedVehicle?.getCurrentKm()).toBe(52000);
  });
});
