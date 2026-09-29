export const MIN_KM_FOR_CPK = 100;
export const CPK_ALERT_THRESHOLD = 0.20;
export const MIN_VEHICLES_FOR_FLEET_COMPARISON = 3;
export const MAX_PLAUSIBLE_KM_PER_DAY = 1200;

export type VehicleCpkStatus = 'OK' | 'ABOVE_AVERAGE' | 'INSUFFICIENT_DATA';
export type InsufficientReason = 'NO_READINGS' | 'KM_REGRESSION' | 'LOW_KM' | 'KM_OUTLIER';

export interface VehicleCostAggregateInput {
  vehicleId: string;
  plate: string;
  model: string;
  year: number;
  fuelCost: number;
  maintenanceCost: number;
  kmStart: number | null;
  kmEnd: number | null;
  validReadingsCount: number;
}

export interface CalculatedVehicleCpk {
  vehicleId: string;
  plate: string;
  model: string;
  year: number;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  km: number;
  cpk: number | null;
  status: VehicleCpkStatus;
  insufficientReason: InsufficientReason | null;
  isEligible: boolean;
  deltaVsFleetPercent: number | null;
  deltaVsPreviousPercent: number | null;
}

export interface FleetCpkSubtotal {
  vehicles: number;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  km: number;
  cpk: number | null;
}

export interface FleetCpkInsufficientSubtotal {
  vehicles: number;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
}

export interface FleetCpkSummary {
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalCost: number;
  eligibleKm: number;
  fleetCpk: number | null;
  fleetComparisonAvailable: boolean;
  eligibleVehicles: number;
  aboveAverageCount: number;
  insufficientDataCount: number;
  eligible: FleetCpkSubtotal;
  insufficient: FleetCpkInsufficientSubtotal;
}

export interface CostPerKmCalculationResult {
  summary: FleetCpkSummary;
  vehicles: CalculatedVehicleCpk[];
}

export function roundHalfUp(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatTwoDecimals(value: number | null): string {
  if (value === null || isNaN(value)) return '0.00';
  return roundHalfUp(value, 2).toFixed(2);
}

export function calculateCostPerKm(
  currentAggregates: VehicleCostAggregateInput[],
  previousAggregates: VehicleCostAggregateInput[] = [],
  days: number = 1,
  previousDays: number = 1
): CostPerKmCalculationResult {
  // 1. Processa cálculos individuais do período atual
  const initialVehicles: CalculatedVehicleCpk[] = currentAggregates.map((item) => {
    const totalCost = item.fuelCost + item.maintenanceCost;

    if (item.kmStart === null || item.kmEnd === null || item.validReadingsCount === 0) {
      return {
        vehicleId: item.vehicleId,
        plate: item.plate,
        model: item.model,
        year: item.year,
        fuelCost: item.fuelCost,
        maintenanceCost: item.maintenanceCost,
        totalCost,
        km: 0,
        cpk: null,
        status: 'INSUFFICIENT_DATA',
        insufficientReason: 'NO_READINGS',
        isEligible: false,
        deltaVsFleetPercent: null,
        deltaVsPreviousPercent: null,
      };
    }

    if (item.kmEnd < item.kmStart) {
      return {
        vehicleId: item.vehicleId,
        plate: item.plate,
        model: item.model,
        year: item.year,
        fuelCost: item.fuelCost,
        maintenanceCost: item.maintenanceCost,
        totalCost,
        km: 0,
        cpk: null,
        status: 'INSUFFICIENT_DATA',
        insufficientReason: 'KM_REGRESSION',
        isEligible: false,
        deltaVsFleetPercent: null,
        deltaVsPreviousPercent: null,
      };
    }

    const deltaKm = item.kmEnd - item.kmStart;

    if (deltaKm < MIN_KM_FOR_CPK) {
      return {
        vehicleId: item.vehicleId,
        plate: item.plate,
        model: item.model,
        year: item.year,
        fuelCost: item.fuelCost,
        maintenanceCost: item.maintenanceCost,
        totalCost,
        km: deltaKm,
        cpk: null,
        status: 'INSUFFICIENT_DATA',
        insufficientReason: 'LOW_KM',
        isEligible: false,
        deltaVsFleetPercent: null,
        deltaVsPreviousPercent: null,
      };
    }

    const effectiveDays = Math.max(1, days);
    const kmPerDay = deltaKm / effectiveDays;

    if (kmPerDay > MAX_PLAUSIBLE_KM_PER_DAY) {
      return {
        vehicleId: item.vehicleId,
        plate: item.plate,
        model: item.model,
        year: item.year,
        fuelCost: item.fuelCost,
        maintenanceCost: item.maintenanceCost,
        totalCost,
        km: deltaKm,
        cpk: null,
        status: 'INSUFFICIENT_DATA',
        insufficientReason: 'KM_OUTLIER',
        isEligible: false,
        deltaVsFleetPercent: null,
        deltaVsPreviousPercent: null,
      };
    }

    const cpk = totalCost / deltaKm;

    return {
      vehicleId: item.vehicleId,
      plate: item.plate,
      model: item.model,
      year: item.year,
      fuelCost: item.fuelCost,
      maintenanceCost: item.maintenanceCost,
      totalCost,
      km: deltaKm,
      cpk,
      status: 'OK',
      insufficientReason: null,
      isEligible: true,
      deltaVsFleetPercent: null,
      deltaVsPreviousPercent: null,
    };
  });

  // 2. Média Ponderada da Frota e Subtotais
  const eligibleVehiclesList = initialVehicles.filter((v) => v.isEligible);
  const eligibleCount = eligibleVehiclesList.length;
  const fleetComparisonAvailable = eligibleCount >= MIN_VEHICLES_FOR_FLEET_COMPARISON;

  const eligibleFuelCost = eligibleVehiclesList.reduce((acc, v) => acc + v.fuelCost, 0);
  const eligibleMaintenanceCost = eligibleVehiclesList.reduce((acc, v) => acc + v.maintenanceCost, 0);
  const eligibleTotalCost = eligibleFuelCost + eligibleMaintenanceCost;
  const eligibleKm = eligibleVehiclesList.reduce((acc, v) => acc + v.km, 0);
  const fleetCpk = eligibleKm > 0 ? eligibleTotalCost / eligibleKm : null;

  // Subtotal dos veículos sem dados suficientes (SEM km)
  const insufficientVehiclesList = initialVehicles.filter((v) => !v.isEligible);
  const insufficientCount = insufficientVehiclesList.length;
  const insufficientFuelCost = insufficientVehiclesList.reduce((acc, v) => acc + v.fuelCost, 0);
  const insufficientMaintenanceCost = insufficientVehiclesList.reduce((acc, v) => acc + v.maintenanceCost, 0);
  const insufficientTotalCost = insufficientFuelCost + insufficientMaintenanceCost;

  // 3. Processa período anterior para comparação de veículos
  const prevMap = new Map<string, { isEligible: boolean; cpk: number | null }>();
  if (previousAggregates.length > 0) {
    const prevCalculation = calculateCostPerKm(
      previousAggregates,
      [],
      previousDays,
      previousDays
    );
    for (const pv of prevCalculation.vehicles) {
      prevMap.set(pv.vehicleId, { isEligible: pv.isEligible, cpk: pv.cpk });
    }
  }

  // 4. Aplica status ABOVE_AVERAGE e deltas percentuais
  const thresholdAlert = fleetCpk !== null ? fleetCpk * (1 + CPK_ALERT_THRESHOLD) : null;
  let aboveAverageCount = 0;

  const finalVehicles = initialVehicles.map((vehicle) => {
    let finalStatus = vehicle.status;
    let deltaVsFleet: number | null = null;

    if (vehicle.isEligible && vehicle.cpk !== null) {
      if (fleetComparisonAvailable && thresholdAlert !== null && fleetCpk !== null) {
        // Comparação estrita: exatamente 20% acima ainda é OK
        if (vehicle.cpk > thresholdAlert) {
          finalStatus = 'ABOVE_AVERAGE';
          aboveAverageCount++;
        }

        if (fleetCpk > 0) {
          deltaVsFleet = roundHalfUp(((vehicle.cpk - fleetCpk) / fleetCpk) * 100, 1);
        }
      }

      // Comparação com período anterior
      const prevData = prevMap.get(vehicle.vehicleId);
      let deltaVsPrevious: number | null = null;
      if (prevData?.isEligible && prevData.cpk !== null && prevData.cpk > 0) {
        deltaVsPrevious = roundHalfUp(((vehicle.cpk - prevData.cpk) / prevData.cpk) * 100, 1);
      }

      return {
        ...vehicle,
        status: finalStatus,
        deltaVsFleetPercent: deltaVsFleet,
        deltaVsPreviousPercent: deltaVsPrevious,
      };
    }

    return vehicle;
  });

  // 5. Totalizadores da Frota (cobrem todos os veículos do filtro)
  const totalFuelCost = eligibleFuelCost + insufficientFuelCost;
  const totalMaintenanceCost = eligibleMaintenanceCost + insufficientMaintenanceCost;
  const totalCost = totalFuelCost + totalMaintenanceCost;

  const summary: FleetCpkSummary = {
    totalFuelCost,
    totalMaintenanceCost,
    totalCost,
    eligibleKm,
    fleetCpk,
    fleetComparisonAvailable,
    eligibleVehicles: eligibleCount,
    aboveAverageCount,
    insufficientDataCount: insufficientCount,
    eligible: {
      vehicles: eligibleCount,
      fuelCost: eligibleFuelCost,
      maintenanceCost: eligibleMaintenanceCost,
      totalCost: eligibleTotalCost,
      km: eligibleKm,
      cpk: fleetCpk,
    },
    insufficient: {
      vehicles: insufficientCount,
      fuelCost: insufficientFuelCost,
      maintenanceCost: insufficientMaintenanceCost,
      totalCost: insufficientTotalCost,
    },
  };

  return { summary, vehicles: finalVehicles };
}
