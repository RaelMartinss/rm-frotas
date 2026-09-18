import {
  CycleAnomaly,
  CycleFuelingRecord,
  FuelConsumptionCycle,
} from '../models/fuel-consumption-cycle.model';

export interface CalculationInput {
  fuelings: CycleFuelingRecord[];
  vehiclePlateMap?: Map<string, { plate: string; model?: string }>;
}

export interface CalculationResult {
  cycles: FuelConsumptionCycle[];
  anomalies: CycleAnomaly[];
  fleetMetrics: {
    totalCalculatedDistanceKm: number;
    totalCalculatedFuelLiters: number;
    totalCalculatedCost: number;
    fleetAverageKmPerLiter: number | null;
    fleetAverageCostPerKm: number | null;
    fleetAverageCostPer100Km: number | null;
    validCyclesCount: number;
  };
}

export class FuelConsumptionCycleCalculator {
  /**
   * Calcula os ciclos de consumo para todos os abastecimentos fornecidos,
   * agrupando estritamente por veículo e ordenando cronologicamente.
   */
  public calculate(input: CalculationInput): CalculationResult {
    const cycles: FuelConsumptionCycle[] = [];
    const anomalies: CycleAnomaly[] = [];

    // Agrupa abastecimentos por veículo
    const byVehicle = new Map<string, CycleFuelingRecord[]>();
    for (const fueling of input.fuelings) {
      // Combustível elétrico não entra no cálculo de km/L na V1 (Seções 14 e 48 da spec)
      if (fueling.fuelType?.toUpperCase() === 'ELETRICO') {
        continue;
      }

      const list = byVehicle.get(fueling.vehicleId) || [];
      list.push(fueling);
      byVehicle.set(fueling.vehicleId, list);
    }

    // Processa cada veículo isoladamente
    for (const [vehicleId, vehicleFuelings] of byVehicle.entries()) {
      // Ordena rigorosamente por data asc, com fallback de hodômetro se mesma data
      vehicleFuelings.sort((a, b) => {
        const timeDiff = new Date(a.fueledAt).getTime() - new Date(b.fueledAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.odometerAtFueling - b.odometerAtFueling;
      });

      const vehicleMeta = input.vehiclePlateMap?.get(vehicleId);
      const vehicleCycles = this.calculateForVehicle(vehicleId, vehicleFuelings, vehicleMeta, anomalies);
      cycles.push(...vehicleCycles);
    }

    // Calcula métricas gerais da frota
    const totalDistance = cycles.reduce((sum, c) => sum + c.distanceKm, 0);
    const totalFuel = cycles.reduce((sum, c) => sum + c.fuelConsumed, 0);
    const totalCost = cycles.reduce((sum, c) => sum + c.totalCost, 0);

    const fleetAverageKmPerLiter =
      totalFuel > 0 && totalDistance > 0
        ? Math.round((totalDistance / totalFuel) * 100) / 100
        : null;

    const fleetAverageCostPerKm =
      totalDistance > 0
        ? Math.round((totalCost / totalDistance) * 100) / 100
        : null;

    const fleetAverageCostPer100Km =
      fleetAverageCostPerKm !== null
        ? Math.round(fleetAverageCostPerKm * 100 * 100) / 100
        : null;

    return {
      cycles,
      anomalies,
      fleetMetrics: {
        totalCalculatedDistanceKm: totalDistance,
        totalCalculatedFuelLiters: Math.round(totalFuel * 100) / 100,
        totalCalculatedCost: Math.round(totalCost * 100) / 100,
        fleetAverageKmPerLiter,
        fleetAverageCostPerKm,
        fleetAverageCostPer100Km,
        validCyclesCount: cycles.length,
      },
    };
  }

  private calculateForVehicle(
    vehicleId: string,
    fuelings: CycleFuelingRecord[],
    vehicleMeta: { plate: string; model?: string } | undefined,
    anomalies: CycleAnomaly[]
  ): FuelConsumptionCycle[] {
    const cycles: FuelConsumptionCycle[] = [];

    let currentStartFueling: CycleFuelingRecord | null = null;
    let intermediateFuelings: CycleFuelingRecord[] = [];

    for (const record of fuelings) {
      if (record.fullTank) {
        if (currentStartFueling === null) {
          // Primeiro tanque cheio encontrado: ponto de partida do primeiro ciclo
          currentStartFueling = record;
          intermediateFuelings = [];
        } else {
          // Temos um ciclo fechado: de currentStartFueling até record
          const startOdometer = currentStartFueling.odometerAtFueling;
          const endOdometer = record.odometerAtFueling;
          const distanceKm = endOdometer - startOdometer;

          // Validação 1: Hodômetro regressivo (Caso 4 da spec)
          if (distanceKm < 0) {
            anomalies.push({
              type: 'ODOMETER_INCONSISTENT',
              vehicleId,
              vehiclePlate: vehicleMeta?.plate,
              title: 'Hodômetro inconsistente',
              description: `Registro com hodômetro anterior (${startOdometer} km) maior que o atual (${endOdometer} km). Diferença: ${distanceKm} km.`,
              startRecordId: currentStartFueling.id,
              endRecordId: record.id,
              startOdometer,
              endOdometer,
              differenceKm: distanceKm,
              recordedAt: new Date(record.fueledAt),
            });

            // Descarta o ciclo inconsistente e reinicia o ponto de partida no registro atual
            currentStartFueling = record;
            intermediateFuelings = [];
            continue;
          }

          // Validação 2: Distância zero (Caso 5 da spec)
          if (distanceKm === 0) {
            anomalies.push({
              type: 'ZERO_DISTANCE',
              vehicleId,
              vehiclePlate: vehicleMeta?.plate,
              title: 'Ciclo sem distância',
              description: `Dois abastecimentos consecutivos possuem o mesmo hodômetro (${startOdometer} km).`,
              startRecordId: currentStartFueling.id,
              endRecordId: record.id,
              startOdometer,
              endOdometer,
              differenceKm: 0,
              recordedAt: new Date(record.fueledAt),
            });

            // Reinicia ciclo no registro mais recente
            currentStartFueling = record;
            intermediateFuelings = [];
            continue;
          }

          // Combustível consumido = intermediários + fechamento (Seções 7 e 8 da spec)
          const allCycleFuelings = [...intermediateFuelings, record];
          const fuelConsumed = allCycleFuelings.reduce((sum, f) => sum + f.liters, 0);
          const totalCost = allCycleFuelings.reduce((sum, f) => sum + f.totalCost, 0);

          if (fuelConsumed <= 0) {
            currentStartFueling = record;
            intermediateFuelings = [];
            continue;
          }

          // Preço médio ponderado por volume: SUM(liters * price) / SUM(liters)
          const weightedSum = allCycleFuelings.reduce(
            (sum, f) => sum + f.liters * f.pricePerUnit,
            0
          );
          const averagePricePerUnit =
            fuelConsumed > 0 ? Math.round((weightedSum / fuelConsumed) * 100) / 100 : 0;

          const kmPerLiter = Math.round((distanceKm / fuelConsumed) * 100) / 100;
          const costPerKm = Math.round((totalCost / distanceKm) * 100) / 100;
          const costPer100Km = Math.round(costPerKm * 100 * 100) / 100;

          cycles.push({
            id: `${currentStartFueling.id}_${record.id}`,
            vehicleId,
            vehiclePlate: vehicleMeta?.plate,
            vehicleModel: vehicleMeta?.model,
            startFuelRecordId: currentStartFueling.id,
            endFuelRecordId: record.id,
            startDate: new Date(currentStartFueling.fueledAt),
            endDate: new Date(record.fueledAt),
            startOdometer,
            endOdometer,
            distanceKm,
            fuelConsumed: Math.round(fuelConsumed * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            averagePricePerUnit,
            kmPerLiter,
            costPerKm,
            costPer100Km,
            fuelType: record.fuelType,
            fullTankFuelingsCount: 2,
            partialFuelingsCount: intermediateFuelings.length,
            intermediateFuelings: [...intermediateFuelings],
            startFueling: currentStartFueling,
            closingFueling: record,
          });

          // Prepara o próximo ciclo: o registro atual passa a ser o ponto de partida
          currentStartFueling = record;
          intermediateFuelings = [];
        }
      } else {
        // Abastecimento parcial: acumula somente se já tivermos um ponto de partida tanque cheio
        if (currentStartFueling !== null) {
          intermediateFuelings.push(record);
        }
      }
    }

    return cycles;
  }
}
