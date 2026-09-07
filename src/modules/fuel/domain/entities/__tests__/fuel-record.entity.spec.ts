import { FuelRecord } from '../fuel-record.entity';
import { FuelType } from '../../enums/fuel-type.enum';
import {
  InvalidFuelAmountException,
  InvalidFuelCostException,
} from '../../exceptions/fuel.exceptions';
import { FuelConsumption } from '../../value-objects/fuel-consumption.vo';

describe('FuelRecord Entity & FuelConsumption VO', () => {
  it('should create a valid FuelRecord entity', () => {
    const record = new FuelRecord({
      ownerId: 'owner-1',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      fuelType: FuelType.GASOLINA,
      liters: 50,
      pricePerUnit: 5.5,
      totalCost: 275,
      odometerAtFueling: 50000,
      gasStation: 'Posto Shell',
      fullTank: true,
      notes: 'Tanque cheio',
    });

    expect(record.getId()).toBeDefined();
    expect(record.getVehicleId()).toBe('vehicle-1');
    expect(record.getDriverId()).toBe('driver-1');
    expect(record.getFuelType()).toBe(FuelType.GASOLINA);
    expect(record.getLiters()).toBe(50);
    expect(record.getPricePerUnit().amount).toBe(5.5);
    expect(record.getTotalCost().amount).toBe(275);
    expect(record.getOdometerAtFueling()).toBe(50000);
    expect(record.isFullTank()).toBe(true);
    expect(record.getGasStation()).toBe('Posto Shell');
  });

  it('should throw InvalidFuelAmountException when liters <= 0', () => {
    expect(() => {
      new FuelRecord({
        ownerId: 'owner-1',
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        fuelType: FuelType.ETANOL,
        liters: 0,
        totalCost: 100,
        odometerAtFueling: 50000,
      });
    }).toThrow(InvalidFuelAmountException);
  });

  it('should throw InvalidFuelCostException when totalCost <= 0', () => {
    expect(() => {
      new FuelRecord({
        ownerId: 'owner-1',
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        fuelType: FuelType.DIESEL,
        liters: 50,
        totalCost: 0,
        odometerAtFueling: 50000,
      });
    }).toThrow(InvalidFuelCostException);
  });

  it('should correctly update fuel record fields', () => {
    const record = new FuelRecord({
      ownerId: 'owner-1',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      fuelType: FuelType.GASOLINA,
      liters: 40,
      totalCost: 240,
      odometerAtFueling: 50000,
    });

    record.update({
      gasStation: 'Posto Petrobras',
      liters: 45,
      totalCost: 270,
      fullTank: false,
    });

    expect(record.getGasStation()).toBe('Posto Petrobras');
    expect(record.getLiters()).toBe(45);
    expect(record.getTotalCost().amount).toBe(270);
    expect(record.isFullTank()).toBe(false);
  });

  it('should correctly calculate fuel consumption between two full tank readings', () => {
    // Abastecimento 1: 50.000 km (tanque cheio)
    // Abastecimento 2: 50.500 km (tanque cheio), abasteceu 50 litros
    // Distância: 500 km / 50 L = 10 km/L
    const consumption = FuelConsumption.calculate(50000, 50500, 50, 275);

    expect(consumption).not.toBeNull();
    expect(consumption!.distanceKm).toBe(500);
    expect(consumption!.litersConsumed).toBe(50);
    expect(consumption!.kmPerLiter).toBe(10);
    expect(consumption!.costPerKm).toBe(0.55); // R$275 / 500 km = R$ 0,55/km
  });

  it('should return null when odometer did not advance or liters <= 0', () => {
    expect(FuelConsumption.calculate(50000, 50000, 50)).toBeNull();
    expect(FuelConsumption.calculate(50000, 49000, 50)).toBeNull();
    expect(FuelConsumption.calculate(50000, 50500, 0)).toBeNull();
  });
});
