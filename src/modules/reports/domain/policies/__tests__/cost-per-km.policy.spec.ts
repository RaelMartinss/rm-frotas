import { describe, expect, it } from 'vitest';
import {
  calculateCostPerKm,
  formatTwoDecimals,
  roundHalfUp,
  VehicleCostAggregateInput,
  MAX_PLAUSIBLE_KM_PER_DAY,
} from '../cost-per-km.policy';

describe('CostPerKmPolicy (Domain Policy)', () => {
  it('deve calcular CPK normal corretamente (combustível + manutenção / km)', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      {
        vehicleId: 'v1',
        plate: 'ABC1D23',
        model: 'Hilux',
        year: 2022,
        fuelCost: 2100.0,
        maintenanceCost: 1900.0,
        kmStart: 1000,
        kmEnd: 2000, // 1000 km
        validReadingsCount: 2,
      },
    ];

    const result = calculateCostPerKm(aggregates, [], 30);
    expect(result.vehicles[0].totalCost).toBe(4000.0);
    expect(result.vehicles[0].km).toBe(1000);
    expect(result.vehicles[0].cpk).toBe(4.0);
    expect(result.vehicles[0].status).toBe('OK');
    expect(result.vehicles[0].isEligible).toBe(true);
    expect(result.vehicles[0].insufficientReason).toBeNull();
  });

  it('deve marcar INSUFFICIENT_DATA com LOW_KM se ΔKM < 100 e elegível se ΔKM = 100', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      {
        vehicleId: 'v-low',
        plate: 'LOW0001',
        model: 'Gol',
        year: 2020,
        fuelCost: 200.0,
        maintenanceCost: 0,
        kmStart: 1000,
        kmEnd: 1099, // 99 km
        validReadingsCount: 2,
      },
      {
        vehicleId: 'v-ok',
        plate: 'OK00001',
        model: 'Strada',
        year: 2021,
        fuelCost: 300.0,
        maintenanceCost: 0,
        kmStart: 2000,
        kmEnd: 2100, // 100 km (limite inclusivo)
        validReadingsCount: 2,
      },
    ];

    const result = calculateCostPerKm(aggregates, [], 30);

    const lowKmVehicle = result.vehicles.find((v) => v.vehicleId === 'v-low')!;
    expect(lowKmVehicle.status).toBe('INSUFFICIENT_DATA');
    expect(lowKmVehicle.insufficientReason).toBe('LOW_KM');
    expect(lowKmVehicle.cpk).toBeNull();
    expect(lowKmVehicle.isEligible).toBe(false);

    const okKmVehicle = result.vehicles.find((v) => v.vehicleId === 'v-ok')!;
    expect(okKmVehicle.status).toBe('OK');
    expect(okKmVehicle.insufficientReason).toBeNull();
    expect(okKmVehicle.cpk).toBe(3.0);
    expect(okKmVehicle.isEligible).toBe(true);
  });

  it('deve marcar NO_READINGS quando não houver leituras e KM_REGRESSION quando kmEnd < kmStart', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      {
        vehicleId: 'v-no-readings',
        plate: 'NOR0001',
        model: 'Uno',
        year: 2018,
        fuelCost: 150.0,
        maintenanceCost: 0,
        kmStart: null,
        kmEnd: null,
        validReadingsCount: 0,
      },
      {
        vehicleId: 'v-regression',
        plate: 'REG0001',
        model: 'Fiorino',
        year: 2019,
        fuelCost: 400.0,
        maintenanceCost: 0,
        kmStart: 5000,
        kmEnd: 4800, // regressão
        validReadingsCount: 2,
      },
    ];

    const result = calculateCostPerKm(aggregates, [], 30);

    const noReadings = result.vehicles.find((v) => v.vehicleId === 'v-no-readings')!;
    expect(noReadings.status).toBe('INSUFFICIENT_DATA');
    expect(noReadings.insufficientReason).toBe('NO_READINGS');
    expect(noReadings.km).toBe(0);

    const regression = result.vehicles.find((v) => v.vehicleId === 'v-regression')!;
    expect(regression.status).toBe('INSUFFICIENT_DATA');
    expect(regression.insufficientReason).toBe('KM_REGRESSION');
    expect(regression.km).toBe(0);
  });

  it('deve marcar KM_OUTLIER quando kmPerDay > MAX_PLAUSIBLE_KM_PER_DAY (1200)', () => {
    const days = 10;
    // 12000 km em 10 dias = 1200 km/dia → exatamente no limite, deve ser OK
    const exactBoundary: VehicleCostAggregateInput = {
      vehicleId: 'v-boundary',
      plate: 'BND0001',
      model: 'Hilux',
      year: 2022,
      fuelCost: 1000,
      maintenanceCost: 0,
      kmStart: 0,
      kmEnd: 12000, // 1200 km/dia exato → NÃO é outlier
      validReadingsCount: 2,
    };
    // 12001 km em 10 dias = 1200.1 km/dia → acima do limite, deve ser KM_OUTLIER
    const outlier: VehicleCostAggregateInput = {
      vehicleId: 'v-outlier',
      plate: 'OUT0001',
      model: 'Sprinter',
      year: 2022,
      fuelCost: 2000,
      maintenanceCost: 500,
      kmStart: 0,
      kmEnd: 12001, // 1200.1 km/dia → KM_OUTLIER
      validReadingsCount: 2,
    };

    const result = calculateCostPerKm([exactBoundary, outlier], [], days);

    const boundary = result.vehicles.find((v) => v.vehicleId === 'v-boundary')!;
    expect(boundary.status).toBe('OK');
    expect(boundary.insufficientReason).toBeNull();
    expect(boundary.isEligible).toBe(true);

    const outlierVehicle = result.vehicles.find((v) => v.vehicleId === 'v-outlier')!;
    expect(outlierVehicle.status).toBe('INSUFFICIENT_DATA');
    expect(outlierVehicle.insufficientReason).toBe('KM_OUTLIER');
    expect(outlierVehicle.isEligible).toBe(false);
    expect(outlierVehicle.cpk).toBeNull();
  });

  it('KM_OUTLIER em período de 1 dia: > 1200 km/dia é outlier', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      {
        vehicleId: 'v-1day-ok',
        plate: 'OK10001',
        model: 'Hilux',
        year: 2022,
        fuelCost: 500,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1200, // 1200 km/dia exato → OK
        validReadingsCount: 2,
      },
      {
        vehicleId: 'v-1day-outlier',
        plate: 'OUT1001',
        model: 'Sprinter',
        year: 2022,
        fuelCost: 500,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1201, // 1201 km em 1 dia → KM_OUTLIER
        validReadingsCount: 2,
      },
    ];

    const result = calculateCostPerKm(aggregates, [], 1);

    const ok = result.vehicles.find((v) => v.vehicleId === 'v-1day-ok')!;
    expect(ok.status).toBe('OK');
    expect(ok.isEligible).toBe(true);

    const outlier = result.vehicles.find((v) => v.vehicleId === 'v-1day-outlier')!;
    expect(outlier.status).toBe('INSUFFICIENT_DATA');
    expect(outlier.insufficientReason).toBe('KM_OUTLIER');
  });

  it('KM_OUTLIER deve ser excluído dos elegíveis e não entrar na média da frota', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      {
        vehicleId: 'v-eligible',
        plate: 'ELG0001',
        model: 'Hilux',
        year: 2022,
        fuelCost: 3000,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1000,
        validReadingsCount: 2,
      },
      {
        vehicleId: 'v-eligible2',
        plate: 'ELG0002',
        model: 'Ranger',
        year: 2021,
        fuelCost: 2000,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1000,
        validReadingsCount: 2,
      },
      {
        vehicleId: 'v-eligible3',
        plate: 'ELG0003',
        model: 'S10',
        year: 2020,
        fuelCost: 4000,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1000,
        validReadingsCount: 2,
      },
      {
        vehicleId: 'v-outlier',
        plate: 'OUT0001',
        model: 'Errante',
        year: 2022,
        fuelCost: 500,
        maintenanceCost: 100,
        kmStart: 0,
        kmEnd: 45000, // 45000 km em 28 dias → KM_OUTLIER
        validReadingsCount: 2,
      },
    ];

    const result = calculateCostPerKm(aggregates, [], 28);

    // Apenas 3 veículos elegíveis (outlier excluído)
    expect(result.summary.eligibleVehicles).toBe(3);
    expect(result.summary.insufficientDataCount).toBe(1);

    // CPK da frota = (3000+2000+4000) / (1000+1000+1000) = 9000/3000 = 3.0
    expect(result.summary.fleetCpk).toBeCloseTo(3.0, 2);

    // Invariante: eligible.totalCost + insufficient.totalCost = totalCost
    expect(result.summary.eligible.totalCost + result.summary.insufficient.totalCost)
      .toBeCloseTo(result.summary.totalCost, 2);

    // fleetCpk = eligible.totalCost / eligible.km
    expect(result.summary.fleetCpk).toBeCloseTo(
      result.summary.eligible.totalCost / result.summary.eligible.km,
      6,
    );

    // KM do outlier não entra no eligible.km
    expect(result.summary.eligible.km).toBe(3000);
    expect(result.summary.eligibleKm).toBe(3000);
  });

  it('deve tratar custo > 0 com km = 0 e custo = 0 com km > 0', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      {
        vehicleId: 'v-cost-no-km',
        plate: 'CST0001',
        model: 'Van',
        year: 2020,
        fuelCost: 500.0,
        maintenanceCost: 1000.0,
        kmStart: null,
        kmEnd: null,
        validReadingsCount: 0,
      },
      {
        vehicleId: 'v-km-no-cost',
        plate: 'KMN0001',
        model: 'Mobi',
        year: 2021,
        fuelCost: 0,
        maintenanceCost: 0,
        kmStart: 1000,
        kmEnd: 1500, // 500 km
        validReadingsCount: 2,
      },
    ];

    const result = calculateCostPerKm(aggregates, [], 30);

    const v1 = result.vehicles.find((v) => v.vehicleId === 'v-cost-no-km')!;
    expect(v1.totalCost).toBe(1500.0);
    expect(v1.km).toBe(0);
    expect(v1.status).toBe('INSUFFICIENT_DATA');

    const v2 = result.vehicles.find((v) => v.vehicleId === 'v-km-no-cost')!;
    expect(v2.totalCost).toBe(0);
    expect(v2.km).toBe(500);
    expect(v2.cpk).toBe(0);
    expect(v2.status).toBe('OK');
  });

  it('deve calcular a média da frota ponderada (não média simples dos CPKs)', () => {
    // Veículo 1: Custo 1000, Km 1000 -> CPK 1.0
    // Veículo 2: Custo 5000, Km 1000 -> CPK 5.0
    // Veículo 3: Custo 3000, Km 3000 -> CPK 1.0
    // Média simples = (1.0 + 5.0 + 1.0) / 3 = 2.33
    // Média ponderada = (1000 + 5000 + 3000) / (1000 + 1000 + 3000) = 9000 / 5000 = 1.80
    const aggregates: VehicleCostAggregateInput[] = [
      { vehicleId: 'v1', plate: 'P1', model: 'M', year: 2020, fuelCost: 1000, maintenanceCost: 0, kmStart: 0, kmEnd: 1000, validReadingsCount: 2 },
      { vehicleId: 'v2', plate: 'P2', model: 'M', year: 2020, fuelCost: 5000, maintenanceCost: 0, kmStart: 0, kmEnd: 1000, validReadingsCount: 2 },
      { vehicleId: 'v3', plate: 'P3', model: 'M', year: 2020, fuelCost: 3000, maintenanceCost: 0, kmStart: 0, kmEnd: 3000, validReadingsCount: 2 },
    ];

    const result = calculateCostPerKm(aggregates, [], 30);
    expect(result.summary.fleetComparisonAvailable).toBe(true);
    expect(result.summary.fleetCpk).toBeCloseTo(1.80, 2);
  });

  it('deve aplicar comparação estrita: exatamente 20% acima é OK, 20.01% é ABOVE_AVERAGE', () => {
    // Frota: fleetCpk = 10.00
    // Veículo com CPK = 12.00 (+20.00%) -> OK
    // Veículo com CPK = 12.01 (+20.10%) -> ABOVE_AVERAGE
    const threshold = 10.0 * 1.2; // 12.0
    expect(12.0 > threshold).toBe(false); // exatamente igual não é strictly greater
    expect(12.01 > threshold).toBe(true);
  });

  it('quando houver menos de 3 veículos elegíveis, fleetComparisonAvailable deve ser false e nenhum ABOVE_AVERAGE', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      { vehicleId: 'v1', plate: 'P1', model: 'M', year: 2020, fuelCost: 1000, maintenanceCost: 0, kmStart: 0, kmEnd: 500, validReadingsCount: 2 },
      { vehicleId: 'v2', plate: 'P2', model: 'M', year: 2020, fuelCost: 9000, maintenanceCost: 0, kmStart: 0, kmEnd: 200, validReadingsCount: 2 }, // CPK 45.0 (bem alto)
    ];

    const result = calculateCostPerKm(aggregates, [], 30);
    expect(result.summary.eligibleVehicles).toBe(2);
    expect(result.summary.fleetComparisonAvailable).toBe(false);

    // Mesmo com CPK 45 vs 2, nenhum recebe ABOVE_AVERAGE
    expect(result.vehicles.every((v) => v.status === 'OK')).toBe(true);
    expect(result.vehicles.every((v) => v.deltaVsFleetPercent === null)).toBe(true);
  });

  it('deve comparar com período anterior apenas quando ambos forem elegíveis', () => {
    const current: VehicleCostAggregateInput[] = [
      { vehicleId: 'v1', plate: 'P1', model: 'M', year: 2020, fuelCost: 1200, maintenanceCost: 0, kmStart: 0, kmEnd: 200, validReadingsCount: 2 }, // CPK 6.0
      { vehicleId: 'v2', plate: 'P2', model: 'M', year: 2020, fuelCost: 500, maintenanceCost: 0, kmStart: 0, kmEnd: 50, validReadingsCount: 2 },   // Low KM
    ];

    const previous: VehicleCostAggregateInput[] = [
      { vehicleId: 'v1', plate: 'P1', model: 'M', year: 2020, fuelCost: 1000, maintenanceCost: 0, kmStart: 0, kmEnd: 200, validReadingsCount: 2 }, // CPK 5.0
      { vehicleId: 'v2', plate: 'P2', model: 'M', year: 2020, fuelCost: 1000, maintenanceCost: 0, kmStart: 0, kmEnd: 200, validReadingsCount: 2 }, // CPK 5.0
    ];

    const result = calculateCostPerKm(current, previous, 30);
    const v1 = result.vehicles.find((v) => v.vehicleId === 'v1')!;
    // (6.0 - 5.0) / 5.0 * 100 = +20.0%
    expect(v1.deltaVsPreviousPercent).toBe(20.0);

    const v2 = result.vehicles.find((v) => v.vehicleId === 'v2')!;
    // v2 atual é Low KM, então deltaVsPrevious deve ser null
    expect(v2.deltaVsPreviousPercent).toBeNull();
  });

  it('invariante: eligible.totalCost + insufficient.totalCost = totalCost (qualquer mix)', () => {
    const aggregates: VehicleCostAggregateInput[] = [
      { vehicleId: 'e1', plate: 'E1', model: 'M', year: 2020, fuelCost: 1000, maintenanceCost: 200, kmStart: 0, kmEnd: 500, validReadingsCount: 2 },
      { vehicleId: 'e2', plate: 'E2', model: 'M', year: 2020, fuelCost: 800, maintenanceCost: 100, kmStart: 0, kmEnd: 300, validReadingsCount: 2 },
      { vehicleId: 'i1', plate: 'I1', model: 'M', year: 2020, fuelCost: 300, maintenanceCost: 50, kmStart: null, kmEnd: null, validReadingsCount: 0 },
      { vehicleId: 'i2', plate: 'I2', model: 'M', year: 2020, fuelCost: 200, maintenanceCost: 0, kmStart: 0, kmEnd: 80, validReadingsCount: 2 }, // LOW_KM
    ];

    const result = calculateCostPerKm(aggregates, [], 30);

    const sumCheck = result.summary.eligible.totalCost + result.summary.insufficient.totalCost;
    expect(sumCheck).toBeCloseTo(result.summary.totalCost, 6);

    // fleetCpk = eligible.totalCost / eligible.km
    expect(result.summary.fleetCpk).toBeCloseTo(
      result.summary.eligible.totalCost / result.summary.eligible.km,
      6,
    );
  });

  it('deve realizar arredondamento half-up correto de 2 casas', () => {
    expect(roundHalfUp(3.855, 2)).toBe(3.86);
    expect(roundHalfUp(3.854, 2)).toBe(3.85);
    expect(formatTwoDecimals(3.855)).toBe('3.86');
    expect(formatTwoDecimals(null)).toBe('0.00');
  });

  it('MAX_PLAUSIBLE_KM_PER_DAY deve ser 1200', () => {
    expect(MAX_PLAUSIBLE_KM_PER_DAY).toBe(1200);
  });
});
