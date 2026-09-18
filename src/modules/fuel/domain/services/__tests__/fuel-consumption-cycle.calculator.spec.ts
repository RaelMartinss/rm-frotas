import { describe, it, expect } from 'vitest';
import { FuelConsumptionCycleCalculator } from '../fuel-consumption-cycle.calculator';
import { CycleFuelingRecord } from '../../models/fuel-consumption-cycle.model';

describe('FuelConsumptionCycleCalculator', () => {
  const calculator = new FuelConsumptionCycleCalculator();

  it('Caso 1: dois tanques cheios consecutivos devem calcular consumo e distância corretamente', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'DIESEL',
        fullTank: true,
      },
      {
        id: 'f2',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-10T10:00:00Z'),
        odometerAtFueling: 10200,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'DIESEL',
        fullTank: true,
      },
    ];

    const result = calculator.calculate({ fuelings });

    expect(result.cycles).toHaveLength(1);
    const cycle = result.cycles[0];
    expect(cycle.distanceKm).toBe(200);
    expect(cycle.fuelConsumed).toBe(50);
    expect(cycle.kmPerLiter).toBe(4.0);
    expect(cycle.totalCost).toBe(300);
    expect(cycle.costPerKm).toBe(1.5); // 300 / 200 = 1.50
    expect(cycle.costPer100Km).toBe(150.0);
    expect(result.anomalies).toHaveLength(0);
  });

  it('Caso 2: abastecimento parcial intermediário deve acumular litros e custos no ciclo', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 40,
        pricePerUnit: 6.0,
        totalCost: 240,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
      {
        id: 'f2',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-05T10:00:00Z'),
        odometerAtFueling: 10100,
        liters: 10,
        pricePerUnit: 7.0,
        totalCost: 70,
        fuelType: 'GASOLINA',
        fullTank: false, // PARCIAL
      },
      {
        id: 'f3',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-10T10:00:00Z'),
        odometerAtFueling: 10200,
        liters: 40,
        pricePerUnit: 6.5,
        totalCost: 260,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
    ];

    const result = calculator.calculate({ fuelings });

    expect(result.cycles).toHaveLength(1);
    const cycle = result.cycles[0];
    expect(cycle.distanceKm).toBe(200); // 10200 - 10000
    expect(cycle.fuelConsumed).toBe(50); // 10 (parcial) + 40 (fechamento)
    expect(cycle.kmPerLiter).toBe(4.0); // 200 / 50 = 4.00
    expect(cycle.totalCost).toBe(330); // 70 + 260
    expect(cycle.costPerKm).toBe(1.65); // 330 / 200
    // Preço médio ponderado: (10 * 7.0 + 40 * 6.5) / 50 = (70 + 260) / 50 = 6.60
    expect(cycle.averagePricePerUnit).toBe(6.6);
    expect(cycle.partialFuelingsCount).toBe(1);
    expect(result.anomalies).toHaveLength(0);
  });

  it('Caso 3: apenas um tanque cheio não deve gerar ciclo de consumo', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
      {
        id: 'f2',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-05T10:00:00Z'),
        odometerAtFueling: 10100,
        liters: 15,
        pricePerUnit: 6.0,
        totalCost: 90,
        fuelType: 'GASOLINA',
        fullTank: false,
      },
    ];

    const result = calculator.calculate({ fuelings });
    expect(result.cycles).toHaveLength(0);
    expect(result.anomalies).toHaveLength(0);
  });

  it('Caso 4: hodômetro regressivo deve ser descartado e registrado como anomalia', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 10200,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
      {
        id: 'f2',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-05T10:00:00Z'),
        odometerAtFueling: 10100, // Menor que o anterior!
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
    ];

    const result = calculator.calculate({ fuelings });
    expect(result.cycles).toHaveLength(0);
    expect(result.anomalies).toHaveLength(1);
    expect(result.anomalies[0].type).toBe('ODOMETER_INCONSISTENT');
    expect(result.anomalies[0].differenceKm).toBe(-100);
  });

  it('Caso 5: distância zero deve ser descartada e registrada como anomalia', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'f1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
      {
        id: 'f2',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-05T10:00:00Z'),
        odometerAtFueling: 10000, // Mesmo hodômetro!
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
    ];

    const result = calculator.calculate({ fuelings });
    expect(result.cycles).toHaveLength(0);
    expect(result.anomalies).toHaveLength(1);
    expect(result.anomalies[0].type).toBe('ZERO_DISTANCE');
  });

  it('Caso 6: múltiplos veículos devem ser calculados de forma totalmente isolada', () => {
    const fuelings: CycleFuelingRecord[] = [
      // Veículo A
      {
        id: 'fa1',
        vehicleId: 'va',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 50000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'DIESEL',
        fullTank: true,
      },
      // Veículo B
      {
        id: 'fb1',
        vehicleId: 'vb',
        fueledAt: new Date('2026-09-02T10:00:00Z'),
        odometerAtFueling: 20000,
        liters: 30,
        pricePerUnit: 5.5,
        totalCost: 165,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
      // Veículo A (fechamento)
      {
        id: 'fa2',
        vehicleId: 'va',
        fueledAt: new Date('2026-09-05T10:00:00Z'),
        odometerAtFueling: 50400,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'DIESEL',
        fullTank: true,
      },
      // Veículo B (fechamento)
      {
        id: 'fb2',
        vehicleId: 'vb',
        fueledAt: new Date('2026-09-06T10:00:00Z'),
        odometerAtFueling: 20300,
        liters: 30,
        pricePerUnit: 5.5,
        totalCost: 165,
        fuelType: 'GASOLINA',
        fullTank: true,
      },
    ];

    const result = calculator.calculate({ fuelings });

    expect(result.cycles).toHaveLength(2);
    const cycleA = result.cycles.find((c) => c.vehicleId === 'va')!;
    const cycleB = result.cycles.find((c) => c.vehicleId === 'vb')!;

    expect(cycleA.distanceKm).toBe(400); // 50400 - 50000
    expect(cycleA.fuelConsumed).toBe(50);
    expect(cycleA.kmPerLiter).toBe(8.0);

    expect(cycleB.distanceKm).toBe(300); // 20300 - 20000
    expect(cycleB.fuelConsumed).toBe(30);
    expect(cycleB.kmPerLiter).toBe(10.0);

    // Média da frota consolidada: (400 + 300) / (50 + 30) = 700 / 80 = 8.75 km/L
    expect(result.fleetMetrics.fleetAverageKmPerLiter).toBe(8.75);
    expect(result.fleetMetrics.totalCalculatedDistanceKm).toBe(700);
    expect(result.fleetMetrics.totalCalculatedFuelLiters).toBe(80);
  });

  it('Caso 7: abastecimento elétrico não deve entrar no cálculo de Km/L', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'fe1',
        vehicleId: 've1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 1000,
        liters: 50,
        pricePerUnit: 1.5,
        totalCost: 75,
        fuelType: 'ELETRICO',
        fullTank: true,
      },
      {
        id: 'fe2',
        vehicleId: 've1',
        fueledAt: new Date('2026-09-05T10:00:00Z'),
        odometerAtFueling: 1300,
        liters: 50,
        pricePerUnit: 1.5,
        totalCost: 75,
        fuelType: 'ELETRICO',
        fullTank: true,
      },
    ];

    const result = calculator.calculate({ fuelings });
    expect(result.cycles).toHaveLength(0);
  });

  it('Caso 8: abastecimento parcial antes do primeiro tanque cheio deve ser ignorado', () => {
    const fuelings: CycleFuelingRecord[] = [
      {
        id: 'fp1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-01T10:00:00Z'),
        odometerAtFueling: 9900,
        liters: 20,
        pricePerUnit: 6.0,
        totalCost: 120,
        fuelType: 'GASOLINA',
        fullTank: false, // Parcial antes de qualquer tanque cheio
      },
      {
        id: 'f1',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-03T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        fullTank: true, // Primeiro tanque cheio
      },
      {
        id: 'f2',
        vehicleId: 'v1',
        fueledAt: new Date('2026-09-10T10:00:00Z'),
        odometerAtFueling: 10200,
        liters: 40,
        pricePerUnit: 6.0,
        totalCost: 240,
        fuelType: 'GASOLINA',
        fullTank: true, // Segundo tanque cheio
      },
    ];

    const result = calculator.calculate({ fuelings });
    expect(result.cycles).toHaveLength(1);
    const cycle = result.cycles[0];
    expect(cycle.distanceKm).toBe(200);
    expect(cycle.fuelConsumed).toBe(40);
    expect(cycle.kmPerLiter).toBe(5.0);
  });
});
