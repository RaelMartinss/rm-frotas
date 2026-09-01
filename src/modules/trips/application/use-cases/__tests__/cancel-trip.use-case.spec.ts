import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { CancelTripUseCase } from '../cancel-trip.use-case';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';

describe('CancelTripUseCase', () => {
  let repository: InMemoryTripsRepository;
  let sut: CancelTripUseCase;

  beforeEach(() => {
    repository = new InMemoryTripsRepository();
    sut = new CancelTripUseCase(repository);
  });

  const dummyLocation = new Location({
    address: 'Rua Teste, 100',
    city: 'Paragominas',
    state: 'PA',
  });

  it('deve cancelar uma viagem planejada com sucesso', async () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      status: TripStatus.PLANNED,
      origin: dummyLocation,
      destination: dummyLocation,
    });
    await repository.create(trip);

    const result = await sut.execute({ tripId: trip.getId() });

    expect(result.getStatus()).toBe(TripStatus.CANCELLED);
  });

  it('não deve permitir cancelar uma viagem que já foi concluída', async () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      status: TripStatus.COMPLETED,
      origin: dummyLocation,
      destination: dummyLocation,
    });
    await repository.create(trip);

    await expect(sut.execute({ tripId: trip.getId() })).rejects.toThrow(
      "Transição inválida do status de viagem de 'COMPLETED' para 'CANCELLED'.",
    );
  });
});
