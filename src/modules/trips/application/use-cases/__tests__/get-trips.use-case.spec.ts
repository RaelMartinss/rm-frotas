import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { GetTripsUseCase } from '../get-trips.use-case';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';

describe('GetTripsUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let sut: GetTripsUseCase;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    sut = new GetTripsUseCase(tripsRepository);
  });

  const createTrip = (overrides: Partial<{
    driverId: string;
    vehicleId: string;
    originAddress: string;
    originCity: string;
    destinationAddress: string;
    destinationCity: string;
    status: TripStatus;
  }> = {}) => {
    return new Trip({
      driverId: overrides.driverId ?? 'driver-1',
      vehicleId: overrides.vehicleId ?? 'vehicle-1',
      status: overrides.status ?? TripStatus.IN_PROGRESS,
      origin: new Location({
        address: overrides.originAddress ?? 'Morada do Sol, 100',
        city: overrides.originCity ?? 'Paragominas',
        state: 'PA',
      }),
      destination: new Location({
        address: overrides.destinationAddress ?? 'Ver-O-Peso',
        city: overrides.destinationCity ?? 'Belém',
        state: 'PA',
      }),
    });
  };

  it('deve listar viagens paginadas sem filtro', async () => {
    await tripsRepository.create(createTrip());
    await tripsRepository.create(createTrip());

    const result = await sut.execute({ page: 1, limit: 10 });

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.page).toBe(1);
  });

  it('deve filtrar viagens por termo de busca (origem ou destino)', async () => {
    await tripsRepository.create(
      createTrip({
        originCity: 'Paragominas',
        destinationCity: 'Belém',
      }),
    );
    await tripsRepository.create(
      createTrip({
        originCity: 'São Luís',
        destinationCity: 'Imperatriz',
      }),
    );

    const result = await sut.execute({
      page: 1,
      limit: 10,
      search: 'belém',
    });

    expect(result.total).toBe(1);
    expect(result.data[0].getDestination().getCity()).toBe('Belém');
  });

  it('deve filtrar viagens por termo de busca no motorista ou veículo', async () => {
    await tripsRepository.create(
      createTrip({
        driverId: 'driver-mikka',
        vehicleId: 'vehicle-tracker',
      }),
    );
    await tripsRepository.create(
      createTrip({
        driverId: 'driver-gael',
        vehicleId: 'vehicle-ducato',
      }),
    );

    const result = await sut.execute({
      page: 1,
      limit: 10,
      search: 'mikka',
    });

    expect(result.total).toBe(1);
    expect(result.data[0].getDriverId()).toBe('driver-mikka');
  });
});
