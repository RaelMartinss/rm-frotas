import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddTripSupplyUseCase } from '../add-trip-supply.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';
import { FuelType } from '../../../../fuel/domain/enums/fuel-type.enum';
import { FuelRecord } from '../../../../fuel/domain/entities/fuel-record.entity';

describe('AddTripSupplyUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let mockRegisterFuelRecordUseCase: any;
  let sut: AddTripSupplyUseCase;
  let trip: Trip;

  beforeEach(async () => {
    tripsRepository = new InMemoryTripsRepository();
    mockRegisterFuelRecordUseCase = {
      execute: vi.fn(),
    };
    sut = new AddTripSupplyUseCase(tripsRepository, mockRegisterFuelRecordUseCase);

    trip = new Trip({
      driverId: 'driver-123',
      vehicleId: 'vehicle-456',
      origin: new Location({ address: 'Garagem Central', city: 'Belém', state: 'PA' }),
      destination: new Location({ address: 'Filial Castanhal', city: 'Castanhal', state: 'PA' }),
      status: TripStatus.IN_PROGRESS,
    });
    await tripsRepository.create(trip);
  });

  it('deve registrar abastecimento vinculado aos dados da viagem', async () => {
    const fakeFuelRecord = new FuelRecord({
      ownerId: 'user-789',
      vehicleId: 'vehicle-456',
      driverId: 'driver-123',
      fuelType: FuelType.DIESEL,
      liters: 60,
      totalCost: 360,
      odometerAtFueling: 120500,
    });

    mockRegisterFuelRecordUseCase.execute.mockResolvedValue(fakeFuelRecord);

    const result = await sut.execute({
      tripId: trip.getId(),
      ownerId: 'user-789',
      fuelType: FuelType.DIESEL,
      liters: 60,
      totalCost: 360,
      odometerAtFueling: 120500,
    });

    expect(result.tripId).toBe(trip.getId());
    expect(result.fuelRecord).toBe(fakeFuelRecord);
    expect(mockRegisterFuelRecordUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'user-789',
        vehicleId: 'vehicle-456',
        driverId: 'driver-123',
        fuelType: FuelType.DIESEL,
        liters: 60,
        totalCost: 360,
        odometerAtFueling: 120500,
      }),
    );
  });

  it('deve lançar TripNotFoundException se a viagem não for encontrada', async () => {
    await expect(
      sut.execute({
        tripId: 'non-existing-id',
        ownerId: 'user-789',
        fuelType: FuelType.DIESEL,
        liters: 50,
        odometerAtFueling: 1000,
      }),
    ).rejects.toThrow(TripNotFoundException);
  });
});
