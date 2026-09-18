import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetTripSuppliesUseCase } from '../get-trip-supplies.use-case';
import { InMemoryTripsRepository } from '../../../infrastructure/repositories/in-memory-trips.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/entities/trip-status.enum';
import { Location } from '../../../domain/value-objects/location.vo';
import { TripNotFoundException } from '../../exceptions/trip-not-found.exception';
import { FuelType } from '../../../../fuel/domain/enums/fuel-type.enum';
import { FuelRecord } from '../../../../fuel/domain/entities/fuel-record.entity';

describe('GetTripSuppliesUseCase', () => {
  let tripsRepository: InMemoryTripsRepository;
  let mockListFuelRecordsUseCase: any;
  let sut: GetTripSuppliesUseCase;
  let trip: Trip;

  beforeEach(async () => {
    tripsRepository = new InMemoryTripsRepository();
    mockListFuelRecordsUseCase = {
      execute: vi.fn(),
    };
    sut = new GetTripSuppliesUseCase(tripsRepository, mockListFuelRecordsUseCase);

    trip = new Trip({
      driverId: 'driver-123',
      vehicleId: 'vehicle-456',
      origin: new Location({ address: 'Garagem Central', city: 'Belém', state: 'PA' }),
      destination: new Location({ address: 'Filial Castanhal', city: 'Castanhal', state: 'PA' }),
      status: TripStatus.IN_PROGRESS,
    });
    await tripsRepository.create(trip);
  });

  it('deve listar os abastecimentos da viagem com sucesso', async () => {
    const fakeFuelRecord = new FuelRecord({
      ownerId: 'user-789',
      vehicleId: 'vehicle-456',
      driverId: 'driver-123',
      fuelType: FuelType.DIESEL,
      liters: 50,
      totalCost: 300,
      odometerAtFueling: 120500,
    });

    mockListFuelRecordsUseCase.execute.mockResolvedValue({
      records: [{ fuelRecord: fakeFuelRecord }],
      total: 1,
    });

    const result = await sut.execute({
      tripId: trip.getId(),
      ownerId: 'user-789',
    });

    expect(result.tripId).toBe(trip.getId());
    expect(result.total).toBe(1);
    expect(result.supplies).toHaveLength(1);
    expect(mockListFuelRecordsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'user-789',
        vehicleId: 'vehicle-456',
        driverId: 'driver-123',
      }),
    );
  });

  it('deve lançar TripNotFoundException se a viagem não for encontrada', async () => {
    await expect(
      sut.execute({
        tripId: 'non-existing-id',
        ownerId: 'user-789',
      }),
    ).rejects.toThrow(TripNotFoundException);
  });
});
