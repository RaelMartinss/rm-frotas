import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTripUseCase } from '../create-trip.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { InMemoryDriversRepository } from '../../../../drivers/infrastructure/repositories/in-memory-drivers.repository';
import { Driver } from '../../../../drivers/domain/entities/driver.entity';
import { DriverStatus } from '../../../../drivers/domain/entities/driver-status.enum';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { Cpf } from '../../../../drivers/domain/value-objects/cpf.vo';
import { Cnh } from '../../../../drivers/domain/value-objects/cnh.vo';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { Trip } from '../../../domain/entities/trip.entity';
import { Location } from '../../../domain/value-objects/location.vo';
import { DriverNotAvailableException } from '../../exceptions/driver-not-available.exception';
import { VehicleNotAvailableException } from '../../exceptions/vehicle-not-available.exception';

describe('CreateTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let driversRepository: InMemoryDriversRepository;
  let vehiclesRepository: InMemoryVehiclesRepository;
  let sut: CreateTripUseCase;

  // Instâncias mock reutilizáveis para os VOs obrigatórios
  const validCpf = new Cpf('12345678909');
  const validCnh = new Cnh('12345678901', 'D', new Date('2030-01-01'));
  const validPlate1 = new LicensePlate('ABC1D23');
  const validPlate2 = new LicensePlate('XYZ9876');

  const validPayload = {
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { address: 'Rua A, 100', city: 'Paragominas', state: 'PA' },
    destination: { address: 'Av. B, 500', city: 'Belém', state: 'PA' },
  };

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    driversRepository = new InMemoryDriversRepository();
    vehiclesRepository = new InMemoryVehiclesRepository();
    sut = new CreateTripUseCase(
      tripsRepository,
      driversRepository,
      vehiclesRepository,
    );
  });

  it('deve criar uma viagem com sucesso quando motorista e veículo estiverem disponíveis', async () => {
    const driver = new Driver({
      name: 'Rael Martins',
      cpf: validCpf,
      cnh: validCnh,
      status: DriverStatus.ACTIVE,
    });
    const vehicle = new Vehicle({
      model: 'Volvo FH',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });

    await driversRepository.create(driver);
    await vehiclesRepository.create(vehicle);

    const trip = await sut.execute({
      ...validPayload,
      driverId: driver.getId(),
      vehicleId: vehicle.getId(),
    });

    expect(trip.getId()).toBeDefined();
    expect(trip.getDriverId()).toBe(driver.getId());
    expect(trip.getVehicleId()).toBe(vehicle.getId());
    expect(tripsRepository.items).toHaveLength(1);
  });

  it('deve lançar exceção se o motorista não for encontrado', async () => {
    const vehicle = new Vehicle({
      model: 'Scania R450',
      plate: validPlate1,
      year: 2022,
      currentKm: 50000,
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepository.create(vehicle);

    await expect(
      sut.execute({ ...validPayload, vehicleId: vehicle.getId() }),
    ).rejects.toThrow(DriverNotAvailableException);
  });

  it('deve lançar exceção se o motorista estiver inativo', async () => {
    const driver = new Driver({
      name: 'João Silva',
      cpf: validCpf,
      cnh: validCnh,
      status: DriverStatus.INACTIVE,
    });
    const vehicle = new Vehicle({
      model: 'Volvo FH',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });

    await driversRepository.create(driver);
    await vehiclesRepository.create(vehicle);

    await expect(
      sut.execute({
        ...validPayload,
        driverId: driver.getId(),
        vehicleId: vehicle.getId(),
      }),
    ).rejects.toThrow(DriverNotAvailableException);
  });

  it('deve lançar exceção se o motorista já possuir uma viagem ativa', async () => {
    const driver = new Driver({
      name: 'Carlos',
      cpf: validCpf,
      cnh: validCnh,
      status: DriverStatus.ACTIVE,
    });
    const vehicle1 = new Vehicle({
      model: 'Volvo FH',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });
    const vehicle2 = new Vehicle({
      model: 'Scania',
      plate: validPlate2,
      year: 2021,
      currentKm: 80000,
      status: VehicleStatus.AVAILABLE,
    });

    await driversRepository.create(driver);
    await vehiclesRepository.create(vehicle1);
    await vehiclesRepository.create(vehicle2);

    const activeTrip = new Trip({
      driverId: driver.getId(),
      vehicleId: vehicle1.getId(),
      origin: new Location(validPayload.origin),
      destination: new Location(validPayload.destination),
    });
    await tripsRepository.create(activeTrip);

    await expect(
      sut.execute({
        ...validPayload,
        driverId: driver.getId(),
        vehicleId: vehicle2.getId(),
      }),
    ).rejects.toThrow(DriverNotAvailableException);
  });

  it('deve lançar exceção se o veículo não for encontrado ou estiver indisponível', async () => {
    const driver = new Driver({
      name: 'Rael Martins',
      cpf: validCpf,
      cnh: validCnh,
      status: DriverStatus.ACTIVE,
    });
    const vehicle = new Vehicle({
      model: 'Mercedes Actros',
      plate: validPlate1,
      year: 2020,
      currentKm: 120000,
      status: VehicleStatus.IN_MAINTENANCE,
    });

    await driversRepository.create(driver);
    await vehiclesRepository.create(vehicle);

    await expect(
      sut.execute({
        ...validPayload,
        driverId: driver.getId(),
        vehicleId: vehicle.getId(),
      }),
    ).rejects.toThrow(VehicleNotAvailableException);
  });

  it('deve lançar exceção se o veículo já estiver em uma viagem ativa', async () => {
    const driver1 = new Driver({
      name: 'Motorista 1',
      cpf: validCpf,
      cnh: validCnh,
      status: DriverStatus.ACTIVE,
    });
    const driver2 = new Driver({
      name: 'Motorista 2',
      cpf: validCpf,
      cnh: validCnh,
      status: DriverStatus.ACTIVE,
    });
    const vehicle = new Vehicle({
      model: 'Volvo FH',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });

    await driversRepository.create(driver1);
    await driversRepository.create(driver2);
    await vehiclesRepository.create(vehicle);

    const activeTrip = new Trip({
      driverId: driver1.getId(),
      vehicleId: vehicle.getId(),
      origin: new Location(validPayload.origin),
      destination: new Location(validPayload.destination),
    });
    await tripsRepository.create(activeTrip);

    await expect(
      sut.execute({
        ...validPayload,
        driverId: driver2.getId(),
        vehicleId: vehicle.getId(),
      }),
    ).rejects.toThrow(VehicleNotAvailableException);
  });
});