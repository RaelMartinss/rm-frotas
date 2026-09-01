import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteTripUseCase } from '../complete-trip.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';

describe('CompleteTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let sut: CompleteTripUseCase;
  let origin: Location;
  let destination: Location;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    sut = new CompleteTripUseCase(tripsRepository);

    origin = new Location({ address: 'Garagem Central', city: 'Paragominas', state: 'PA' });
    destination = new Location({ address: 'Filial 01', city: 'Belém', state: 'PA' });
  });

  it('deve finalizar uma viagem em andamento com sucesso', async () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      origin,
      destination,
    });
    trip.start();
    await tripsRepository.create(trip);

    const result = await sut.execute({ tripId: trip.getId() });

    expect(result.getStatus()).toBe(TripStatus.COMPLETED);
    expect(result.getCompletedAt()).toBeInstanceOf(Date);
  });

  it('deve lançar exceção caso a viagem não exista', async () => {
    await expect(sut.execute({ tripId: 'invalid-id' })).rejects.toThrow(TripNotFoundException);
  });
});