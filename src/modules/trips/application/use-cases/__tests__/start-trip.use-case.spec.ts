import { describe, it, expect, beforeEach } from 'vitest';
import { StartTripUseCase } from '../start-trip.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';

describe('StartTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let sut: StartTripUseCase;
  let origin: Location;
  let destination: Location;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    sut = new StartTripUseCase(tripsRepository);

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