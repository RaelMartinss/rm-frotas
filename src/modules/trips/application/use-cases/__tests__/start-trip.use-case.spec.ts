import { describe, it, expect, beforeEach } from 'vitest';
import { StartTripUseCase } from '../start-trip.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';
import { IDriversRepository } from '../../../../drivers/domain/repositories/drivers.repository';
import { Driver } from '../../../../drivers/domain/entities/driver.entity';
import { Cpf } from '../../../../drivers/domain/value-objects/cpf.vo';
import { Cnh } from '../../../../drivers/domain/value-objects/cnh.vo';
import { DriverStatus } from '../../../../drivers/domain/entities/driver-status.enum';

// Mock do repositório de drivers para evitar dependência real
class MockDriversRepository implements IDriversRepository {
  async save(): Promise<void> {}
  async findById(): Promise<Driver | null> {
    const driver = new Driver({
      name: 'Test Driver',
      cpf: new Cpf('529.982.247-25'),
      cnh: new Cnh('98765432100', 'D', new Date('2030-01-01')),
      status: DriverStatus.ACTIVE,
    });
    return driver;
  }
  async findByCpf(): Promise<Driver | null> {
    return null;
  }
  async findAll(): Promise<Driver[]> {
    return [];
  }
}

describe('StartTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let driversRepository: IDriversRepository;
  let sut: StartTripUseCase;
  let origin: Location;
  let destination: Location;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    driversRepository = new MockDriversRepository();
    sut = new StartTripUseCase(tripsRepository, driversRepository);

    origin = new Location({ address: 'Garagem Central', city: 'Paragominas', state: 'PA' });
    destination = new Location({ address: 'Filial 01', city: 'Belém', state: 'PA' });
  });

  it('deve iniciar uma viagem planejada com sucesso', async () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
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
});