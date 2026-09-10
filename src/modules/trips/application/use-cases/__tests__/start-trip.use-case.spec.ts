import { describe, it, expect, beforeEach } from 'vitest';
import { StartTripUseCase } from '../start-trip.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';
import { DriverCnhInvalidForTripException } from '../../exceptions/driver-cnh-invalid-for-trip.exception';
import { IDriversRepository } from '../../../../drivers/domain/repositories/drivers.repository';
import { Driver } from '../../../../drivers/domain/entities/driver.entity';
import { Cpf } from '../../../../drivers/domain/value-objects/cpf.vo';
import { Cnh } from '../../../../drivers/domain/value-objects/cnh.vo';
import { DriverStatus } from '../../../../drivers/domain/entities/driver-status.enum';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';

// Mock do repositório de drivers para evitar dependência real
class MockDriversRepository implements IDriversRepository {
  public driver: Driver | null = new Driver({
    name: 'Test Driver',
    cpf: new Cpf('529.982.247-25'),
    cnh: new Cnh('98765432100', 'D', new Date('2030-01-01')),
    status: DriverStatus.ACTIVE,
  });

  async save(): Promise<void> {}
  async findById(): Promise<Driver | null> {
    return this.driver;
  }
  async findByCpf(): Promise<Driver | null> {
    return null;
  }
  async findAll(): Promise<Driver[]> {
    return [];
  }
  async findManyPaginated(): Promise<{ drivers: Driver[]; total: number }> {
    return { drivers: [], total: 0 };
  }
}

describe('StartTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let driversRepository: IDriversRepository;
  let vehiclesRepository: InMemoryVehiclesRepository;
  let sut: StartTripUseCase;
  let origin: Location;
  let destination: Location;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    driversRepository = new MockDriversRepository();
    vehiclesRepository = new InMemoryVehiclesRepository();
    sut = new StartTripUseCase(tripsRepository, driversRepository, vehiclesRepository);

    origin = new Location({ address: 'Garagem Central', city: 'Paragominas', state: 'PA' });
    destination = new Location({ address: 'Filial 01', city: 'Belém', state: 'PA' });
  });

  it('deve iniciar uma viagem planejada com sucesso', async () => {
    const vehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Volvo FH',
      year: 2022,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepository.save(vehicle);

    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: vehicle.getId(),
      origin,
      destination,
    });
    await tripsRepository.create(trip);

    const result = await sut.execute({ tripId: trip.getId() });

    expect(result.getStatus()).toBe(TripStatus.IN_PROGRESS);
    expect(result.getStartedAt()).toBeInstanceOf(Date);
  });

  it('deve lançar exceção caso a viagem não exista', async () => {
    await expect(sut.execute({ tripId: 'invalid-id' })).rejects.toThrow(TripNotFoundException);
  });

  it('deve lançar exceção caso a CNH do motorista esteja vencida', async () => {
    const vehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Volvo FH',
      year: 2022,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepository.save(vehicle);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    (driversRepository as MockDriversRepository).driver = new Driver({
      name: 'Expired Driver',
      cpf: new Cpf('529.982.247-25'),
      cnh: new Cnh('98765432100', 'D', pastDate),
      status: DriverStatus.ACTIVE,
    });

    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: vehicle.getId(),
      origin,
      destination,
    });
    await tripsRepository.create(trip);

    await expect(sut.execute({ tripId: trip.getId() })).rejects.toThrow(
      DriverCnhInvalidForTripException,
    );
  });

  it('deve lançar exceção caso a CNH do motorista vença em 1 dia (regra estrita)', async () => {
    const vehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Volvo FH',
      year: 2022,
      currentKm: 10000,
      status: VehicleStatus.AVAILABLE,
    });
    await vehiclesRepository.save(vehicle);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    (driversRepository as MockDriversRepository).driver = new Driver({
      name: 'Gael Silva',
      cpf: new Cpf('529.982.247-25'),
      cnh: new Cnh('98765432100', 'D', tomorrow),
      status: DriverStatus.ACTIVE,
    });

    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: vehicle.getId(),
      origin,
      destination,
    });
    await tripsRepository.create(trip);

    await expect(sut.execute({ tripId: trip.getId() })).rejects.toThrow(
      DriverCnhInvalidForTripException,
    );
  });
});