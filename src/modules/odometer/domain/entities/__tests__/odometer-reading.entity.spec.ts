import { describe, expect, it } from 'vitest';
import { OdometerReading } from '../odometer-reading.entity';
import { OdometerSource } from '../../value-objects/odometer-source.vo';
import { OdometerRegressionException } from '../../exceptions/odometer-regression.exception';

describe('OdometerReading Entity', () => {
  it('should create an OdometerReading when currentKm >= previousKm', () => {
    const reading = OdometerReading.create({
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      ownerId: 'user-1',
      previousKm: 10000,
      currentKm: 10500,
      source: OdometerSource.FUEL,
      sourceId: 'fuel-123',
    });

    expect(reading.getId()).toBeDefined();
    expect(reading.getClientId()).toBe('client-1');
    expect(reading.getVehicleId()).toBe('vehicle-1');
    expect(reading.getPreviousKm().getValue()).toBe(10000);
    expect(reading.getCurrentKm().getValue()).toBe(10500);
    expect(reading.getSource()).toBe(OdometerSource.FUEL);
    expect(reading.getSourceId()).toBe('fuel-123');
    expect(reading.getReason()).toBeNull();
  });

  it('should throw OdometerRegressionException when currentKm < previousKm and source != MANUAL', () => {
    expect(() =>
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        ownerId: 'user-1',
        previousKm: 10000,
        currentKm: 9500,
        source: OdometerSource.FUEL,
        sourceId: 'fuel-123',
      }),
    ).toThrow(OdometerRegressionException);

    expect(() =>
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        ownerId: 'user-1',
        previousKm: 10000,
        currentKm: 9500,
        source: OdometerSource.TRIP,
        sourceId: 'trip-123',
      }),
    ).toThrow(OdometerRegressionException);

    expect(() =>
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        ownerId: 'user-1',
        previousKm: 10000,
        currentKm: 9500,
        source: OdometerSource.MAINTENANCE,
        sourceId: 'maint-123',
      }),
    ).toThrow(OdometerRegressionException);
  });

  it('should allow lower currentKm when source is MANUAL and reason is provided', () => {
    const reading = OdometerReading.create({
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      ownerId: 'user-1',
      previousKm: 10000,
      currentKm: 8500,
      source: OdometerSource.MANUAL,
      sourceId: 'manual-corr-1',
      reason: 'Troca de painel de instrumentos por defeito elétrico comprovado em concessionária',
    });

    expect(reading.getCurrentKm().getValue()).toBe(8500);
    expect(reading.getPreviousKm().getValue()).toBe(10000);
    expect(reading.getSource()).toBe(OdometerSource.MANUAL);
    expect(reading.getReason()).toContain('Troca de painel');
  });

  it('should throw error when source is MANUAL but reason is empty', () => {
    expect(() =>
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        ownerId: 'user-1',
        previousKm: 10000,
        currentKm: 8500,
        source: OdometerSource.MANUAL,
        sourceId: 'manual-corr-1',
        reason: '',
      }),
    ).toThrow('Justificativa é obrigatória para correções manuais de odômetro.');

    expect(() =>
      OdometerReading.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        ownerId: 'user-1',
        previousKm: 10000,
        currentKm: 8500,
        source: OdometerSource.MANUAL,
        sourceId: 'manual-corr-1',
        reason: '   ',
      }),
    ).toThrow('Justificativa é obrigatória para correções manuais de odômetro.');
  });

  it('should throw error when sourceId, clientId, vehicleId or ownerId is empty', () => {
    expect(() =>
      OdometerReading.create({
        clientId: '',
        vehicleId: 'v-1',
        ownerId: 'u-1',
        previousKm: 0,
        currentKm: 100,
        source: OdometerSource.FUEL,
        sourceId: 'f-1',
      }),
    ).toThrow('clientId é obrigatório');

    expect(() =>
      OdometerReading.create({
        clientId: 'c-1',
        vehicleId: '',
        ownerId: 'u-1',
        previousKm: 0,
        currentKm: 100,
        source: OdometerSource.FUEL,
        sourceId: 'f-1',
      }),
    ).toThrow('vehicleId é obrigatório');

    expect(() =>
      OdometerReading.create({
        clientId: 'c-1',
        vehicleId: 'v-1',
        ownerId: 'u-1',
        previousKm: 0,
        currentKm: 100,
        source: OdometerSource.FUEL,
        sourceId: '',
      }),
    ).toThrow('sourceId é obrigatório');
  });
});
