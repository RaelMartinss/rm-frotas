import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { CancelTripUseCase } from '../cancel-trip.use-case';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { InMemoryVehiclesRepository } from '../../../../vehicles/infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle, VehicleStatus } from '../../../../vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../../../../vehicles/domain/value-objects/license-plate.vo';

describe('CancelTripUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let vehiclesRepository: InMemoryVehiclesRepository;
  let sut: CancelTripUseCase;

  beforeEach(() => {
    tripsRepository = new InMemoryTripsRepository();
    vehiclesRepository = new InMemoryVehiclesRepository();
    sut = new CancelTripUseCase(tripsRepository, vehiclesRepository);
  });

  const dummyLocation = new Location({
    address: 'Rua Teste, 100',
    city: 'Paragominas',
    state: 'PA',
  });

  it('deve cancelar uma viagem planejada com sucesso', async () => {
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
      status: TripStatus.PLANNED,
      origin: dummyLocation,
      destination: dummyLocation,
    });
    await tripsRepository.save(trip);

    const result = await sut.execute({ tripId: trip.getId() });

    expect(result.getStatus()).toBe(TripStatus.CANCELLED);
  });

  it('não deve permitir cancelar uma viagem que já foi concluída', async () => {
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
      status: TripStatus.COMPLETED,
      origin: dummyLocation,
      destination: dummyLocation,
    });
    await tripsRepository.save(trip);

    await expect(sut.execute({ tripId: trip.getId() })).rejects.toThrow(
      "Transição inválida do status de viagem de 'COMPLETED' para 'CANCELLED'.",
    );
  });

  it('deve cancelar uma viagem em andamento e liberar o veículo', async () => {
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
      status: TripStatus.IN_PROGRESS,
      origin: dummyLocation,
      destination: dummyLocation,
    });
    await tripsRepository.save(trip);

    const result = await sut.execute({ tripId: trip.getId() });

    expect(result.getStatus()).toBe(TripStatus.CANCELLED);

    const updatedVehicle = await vehiclesRepository.findById(vehicle.getId());
    expect(updatedVehicle?.getStatus()).toBe(VehicleStatus.AVAILABLE);
  });
});