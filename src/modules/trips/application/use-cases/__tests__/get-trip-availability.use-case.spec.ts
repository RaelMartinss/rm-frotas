import { describe, it, expect, beforeEach } from 'vitest';
import { GetTripAvailabilityUseCase } from '../get-trip-availability.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { InMemoryDriversRepository } from '../../../../drivers/infrastructure/repositories/in-memory-drivers.repository';
import { Driver, DriverStatus } from '../../../../drivers/domain/entities/driver.entity';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { Cpf } from '../../../../drivers/domain/value-objects/cpf.vo';
import { Cnh } from '../../../../drivers/domain/value-objects/cnh.vo';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';
import { Trip } from '../../../domain/entities/trip.entity';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripStatus } from '../../../domain/entities/trip-status.enum';

describe('GetTripAvailabilityUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let driversRepository: InMemoryDriversRepository;
  let vehiclesRepository: InMemoryVehiclesRepository;
  let sut: GetTripAvailabilityUseCase;

  const validCpf1 = new Cpf('12345678909');
  const validCpf2 = new Cpf('98765432100');
  const validCnh1 = new Cnh('12345678901', 'D', new Date('2030-01-01'));
  const validCnh2 = new Cnh('98765432100', 'E', new Date('2030-01-01'));
  const validPlate1 = new LicensePlate('ABC1D23');
  const validPlate2 = new LicensePlate('XYZ9876');

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    driversRepository = new InMemoryDriversRepository();
    vehiclesRepository = new InMemoryVehiclesRepository();
    sut = new GetTripAvailabilityUseCase(
      tripsRepository,
      vehiclesRepository,
      driversRepository,
    );
  });

  it('deve retornar veículos AVAILABLE e motoristas ACTIVE sem viagens', async () => {
    const driver1 = new Driver({
      name: 'Motorista 1',
      cpf: validCpf1,
      cnh: validCnh1,
      status: DriverStatus.ACTIVE,
    });
    const driver2 = new Driver({
      name: 'Motorista 2 Inativo',
      cpf: validCpf2,
      cnh: validCnh2,
      status: DriverStatus.INACTIVE,
    });

    const vehicle1 = new Vehicle({
      model: 'Volvo FH',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });
    const vehicle2 = new Vehicle({
      model: 'Scania R450',
      plate: validPlate2,
      year: 2022,
      currentKm: 50000,
      status: VehicleStatus.IN_MAINTENANCE,
    });

    await driversRepository.save(driver1);
    await driversRepository.save(driver2);
    await vehiclesRepository.save(vehicle1);
    await vehiclesRepository.save(vehicle2);

    const result = await sut.execute({});

    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].getId()).toBe(vehicle1.getId());

    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0].getId()).toBe(driver1.getId());
  });

  it('deve excluir veículos e motoristas alocados em viagens PLANNED ou IN_PROGRESS', async () => {
    const driver1 = new Driver({
      name: 'Motorista 1 Livre',
      cpf: validCpf1,
      cnh: validCnh1,
      status: DriverStatus.ACTIVE,
    });
    const driver2 = new Driver({
      name: 'Motorista 2 Ocupado',
      cpf: validCpf2,
      cnh: validCnh2,
      status: DriverStatus.ACTIVE,
    });

    const vehicle1 = new Vehicle({
      model: 'Volvo FH Livre',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });
    const vehicle2 = new Vehicle({
      model: 'Scania Ocupado',
      plate: validPlate2,
      year: 2022,
      currentKm: 50000,
      status: VehicleStatus.AVAILABLE,
    });

    await driversRepository.save(driver1);
    await driversRepository.save(driver2);
    await vehiclesRepository.save(vehicle1);
    await vehiclesRepository.save(vehicle2);

    // Cria viagem PLANNED para driver2 e vehicle2
    const plannedTrip = new Trip({
      driverId: driver2.getId(),
      vehicleId: vehicle2.getId(),
      origin: new Location({ address: 'Rua A', city: 'Belém', state: 'PA' }),
      destination: new Location({ address: 'Rua B', city: 'Santarém', state: 'PA' }),
    });
    await tripsRepository.create(plannedTrip);

    const result = await sut.execute({});

    // Apenas driver1 e vehicle1 devem estar disponíveis
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].getId()).toBe(vehicle1.getId());

    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0].getId()).toBe(driver1.getId());
  });

  it('deve permitir incluir o veículo e motorista da própria viagem ao passar excludeTripId', async () => {
    const driver = new Driver({
      name: 'Motorista em Edição',
      cpf: validCpf1,
      cnh: validCnh1,
      status: DriverStatus.ACTIVE,
    });
    const vehicle = new Vehicle({
      model: 'Volvo em Edição',
      plate: validPlate1,
      year: 2023,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });

    await driversRepository.save(driver);
    await vehiclesRepository.save(vehicle);

    const trip = new Trip({
      driverId: driver.getId(),
      vehicleId: vehicle.getId(),
      origin: new Location({ address: 'Rua A', city: 'Belém', state: 'PA' }),
      destination: new Location({ address: 'Rua B', city: 'Santarém', state: 'PA' }),
    });
    await tripsRepository.create(trip);

    // Sem excludeTripId: nenhum disponível
    const withoutExclude = await sut.execute({});
    expect(withoutExclude.vehicles).toHaveLength(0);
    expect(withoutExclude.drivers).toHaveLength(0);

    // Com excludeTripId: veículo e motorista aparecem disponíveis para a edição
    const withExclude = await sut.execute({ excludeTripId: trip.getId() });
    expect(withExclude.vehicles).toHaveLength(1);
    expect(withExclude.vehicles[0].getId()).toBe(vehicle.getId());
    expect(withExclude.drivers).toHaveLength(1);
    expect(withExclude.drivers[0].getId()).toBe(driver.getId());
  });
});
