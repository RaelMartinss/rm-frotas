import { describe, it, expect, beforeEach } from 'vitest';
import { CompleteTripUseCase } from '../complete-trip.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';

describe('CompleteTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let vehiclesRepository: InMemoryVehiclesRepository;
  let sut: CompleteTripUseCase;
  let origin: Location;
  let destination: Location;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    vehiclesRepository = new InMemoryVehiclesRepository();
    sut = new CompleteTripUseCase(tripsRepository, vehiclesRepository);

    origin = new Location({ address: 'Garagem Central', city: 'Paragominas', state: 'PA' });
    destination = new Location({ address: 'Filial 01', city: 'Belém', state: 'PA' });
  });

  it('deve finalizar uma viagem em andamento com sucesso', async () => {
    const vehicle = new Vehicle({
      plate: new LicensePlate('ABC1D23'),
      model: 'Volvo FH',
      year: 2022,
      currentKm: 10000,
      status: VehicleStatus.IN_USE,
    });
    await vehiclesRepository.save(vehicle);

    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: vehicle.getId(),
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