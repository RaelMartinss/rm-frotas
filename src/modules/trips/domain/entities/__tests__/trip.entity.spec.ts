import { describe, it, expect, beforeEach } from 'vitest';
import { Trip } from '../trip.entity';
import { TripStatus } from '../trip-status.enum';
import { Location } from '../../value-objects/location.vo';
import { InvalidTripStatusTransitionException } from '../../exceptions/invalid-trip-status-transition.exception';

describe('Trip Entity', () => {
  let origin: Location;
  let destination: Location;

  beforeEach(() => {
    origin = new Location({
      address: 'Garagem Central',
      city: 'Paragominas',
      state: 'PA',
    });

    destination = new Location({
      address: 'Unidade Industrial',
      city: 'Belém',
      state: 'PA',
    });
  });

  it('deve criar uma viagem com status inicial PLANNED', () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      origin,
      destination,
    });

    expect(trip.getId()).toBeDefined();
    expect(trip.getStatus()).toBe(TripStatus.PLANNED);
    expect(trip.getStartedAt()).toBeUndefined();
    expect(trip.getCompletedAt()).toBeUndefined();
  });

  it('deve iniciar uma viagem planejada', () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      origin,
      destination,
    });

    trip.start();

    expect(trip.getStatus()).toBe(TripStatus.IN_PROGRESS);
    expect(trip.getStartedAt()).toBeInstanceOf(Date);
  });

  it('deve lançar exceção ao tentar iniciar uma viagem finalizada', () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      origin,
      destination,
    });

    trip.start();
    trip.complete();

    expect(() => trip.start()).toThrow(InvalidTripStatusTransitionException);
  });

  it('deve finalizar uma viagem em andamento', () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      origin,
      destination,
    });

    trip.start();
    trip.complete();

    expect(trip.getStatus()).toBe(TripStatus.COMPLETED);
    expect(trip.getCompletedAt()).toBeInstanceOf(Date);
  });

  it('deve cancelar uma viagem em planejamento', () => {
    const trip = new Trip({
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      origin,
      destination,
    });

    trip.cancel();

    expect(trip.getStatus()).toBe(TripStatus.CANCELLED);
  });
});