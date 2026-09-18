import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { FuelConsumptionCycleCalculator } from '../../domain/services/fuel-consumption-cycle.calculator';
import {
  CycleFuelingRecord,
  FuelConsumptionCycle,
  CycleAnomaly,
} from '../../domain/models/fuel-consumption-cycle.model';
import { FuelType } from '../../domain/enums/fuel-type.enum';

export interface GetEfficiencyReportInput {
  ownerId: string;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  vehicleId?: string;
  fuelType?: FuelType;
  comparePreviousPeriod?: boolean;
}

export interface EfficiencyReportSummary {
  totalCost: number;
  totalLiters: number;
  fuelingCount: number;
  weightedAveragePrice: number;
}

export interface EfficiencyReportMetrics {
  averageKmPerLiter: number | null;
  distanceKm: number;
  fuelConsumed: number;
  costPerKm: number | null;
  costPer100Km: number | null;
  validCycles: number;
}

export interface EfficiencyDataQuality {
  status: 'GOOD' | 'PARTIAL' | 'INSUFFICIENT';
  totalFuelings: number;
  validCycles: number;
  insufficientVehiclesCount: number;
  message: string;
}

export interface EfficiencyVehicleItem {
  vehicleId: string;
  plate: string;
  model: string;
  brand?: string | null;
  status: string;
  totalFuelings: number;
  fullTankFuelings: number;
  validCyclesCount: number;
  averageKmPerLiter: number | null;
  totalDistanceKm: number;
  totalFuelConsumed: number;
  totalCost: number;
  costPerKm: number | null;
  hasSufficientData: boolean;
  message?: string;
}

export interface EfficiencyConsumptionEvolutionPoint {
  cycleId: string;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
  kmPerLiter: number;
  distanceKm: number;
  fuelConsumed: number;
  totalCost: number;
}

export interface EfficiencyTimeSeriesPoint {
  date: string;
  value: number;
}

export interface EfficiencyFuelDistributionItem {
  fuelType: string;
  label: string;
  totalLiters: number;
  totalCost: number;
  percentage: number;
}

export interface PeriodComparisonItem {
  consumptionDiffPercent: number | null;
  costDiffPercent: number | null;
  priceDiffPercent: number | null;
  volumeDiffPercent: number | null;
  previousSummary: EfficiencyReportSummary;
  previousEfficiency: EfficiencyReportMetrics;
}

export interface FuelEfficiencyReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: EfficiencyReportSummary;
  efficiency: EfficiencyReportMetrics;
  dataQuality: EfficiencyDataQuality;
  vehicleEfficiency: EfficiencyVehicleItem[];
  consumptionEvolution: EfficiencyConsumptionEvolutionPoint[];
  costEvolution: EfficiencyTimeSeriesPoint[];
  volumeEvolution: EfficiencyTimeSeriesPoint[];
  priceEvolution: EfficiencyTimeSeriesPoint[];
  fuelDistribution: EfficiencyFuelDistributionItem[];
  consumptionCycles: FuelConsumptionCycle[];
  anomalies: CycleAnomaly[];
  comparison?: PeriodComparisonItem | null;
}

const FUEL_LABELS: Record<string, string> = {
  GASOLINA: 'Gasolina',
  ETANOL: 'Etanol',
  DIESEL: 'Diesel',
  DIESEL_S10: 'Diesel S-10',
  GNV: 'GNV',
  ELETRICO: 'Elétrico',
};

@Injectable()
export class FuelEfficiencyReportService {
  private readonly calculator = new FuelConsumptionCycleCalculator();

  constructor(private readonly prisma: PrismaService) {}

  public async getEfficiencyReport(
    input: GetEfficiencyReportInput
  ): Promise<FuelEfficiencyReportResponse> {
    // 1. Normalização do período: default últimos 30 dias (Seção 12 da spec)
    const now = new Date();
    const endDate = input.endDate ? new Date(input.endDate) : now;
    const startDate = input.startDate
      ? new Date(input.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const clientFilter: any = input.clientId
      ? { clientId: input.clientId }
      : { ownerId: input.ownerId };

    // 2. Busca veículos do cliente
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        ...clientFilter,
        ...(input.vehicleId && { id: input.vehicleId }),
      },
      select: {
        id: true,
        plate: true,
        model: true,
        brand: true,
        status: true,
      },
    });

    const vehicleMetaMap = new Map<string, { plate: string; model?: string; brand?: string | null; status: string }>();
    for (const v of vehicles) {
      vehicleMetaMap.set(v.id, {
        plate: v.plate,
        model: v.model,
        brand: v.brand,
        status: v.status,
      });
    }

    // 3. Executa o cálculo para o período atual
    const currentData = await this.computeReportForPeriod(
      clientFilter,
      startDate,
      endDate,
      input.vehicleId,
      input.fuelType,
      vehicles,
      vehicleMetaMap
    );

    // 4. Comparação com período anterior (se solicitado - Seção 30 da spec)
    let comparison: PeriodComparisonItem | null = null;
    if (input.comparePreviousPeriod) {
      const durationMs = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

      const prevData = await this.computeReportForPeriod(
        clientFilter,
        prevStartDate,
        prevEndDate,
        input.vehicleId,
        input.fuelType,
        vehicles,
        vehicleMetaMap
      );

      const calcPercentDiff = (current: number | null, previous: number | null) => {
        if (current === null || previous === null || previous === 0) return null;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
      };

      comparison = {
        consumptionDiffPercent: calcPercentDiff(
          currentData.efficiency.averageKmPerLiter,
          prevData.efficiency.averageKmPerLiter
        ),
        costDiffPercent: calcPercentDiff(
          currentData.summary.totalCost,
          prevData.summary.totalCost
        ),
        priceDiffPercent: calcPercentDiff(
          currentData.summary.weightedAveragePrice,
          prevData.summary.weightedAveragePrice
        ),
        volumeDiffPercent: calcPercentDiff(
          currentData.summary.totalLiters,
          prevData.summary.totalLiters
        ),
        previousSummary: prevData.summary,
        previousEfficiency: prevData.efficiency,
      };
    }

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      ...currentData,
      comparison,
    };
  }

  private async computeReportForPeriod(
    clientFilter: any,
    startDate: Date,
    endDate: Date,
    vehicleId?: string,
    fuelType?: FuelType,
    vehicles?: Array<{ id: string; plate: string; model: string; brand: string | null; status: string }>,
    vehicleMetaMap?: Map<string, { plate: string; model?: string; brand?: string | null; status: string }>
  ) {
    // Busca abastecimentos do período
    const periodWhere: any = {
      ...clientFilter,
      ...(vehicleId && { vehicleId }),
      ...(fuelType && { fuelType: fuelType as any }),
      fueledAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const periodRecords = await this.prisma.fuelRecord.findMany({
      where: periodWhere,
      orderBy: [{ fueledAt: 'asc' }, { odometerAtFueling: 'asc' }],
    });

    // Seção 35 da spec: Buscar contexto anterior para fechar ciclos que cruzam a fronteira
    // Para cada veículo, busca o último abastecimento com tanque cheio anterior a startDate
    const vehicleIdsToQuery = vehicleId
      ? [vehicleId]
      : Array.from(new Set(periodRecords.map((r) => r.vehicleId)));

    const priorRecords: any[] = [];
    for (const vId of vehicleIdsToQuery) {
      const lastPriorFullTank = await this.prisma.fuelRecord.findFirst({
        where: {
          ...clientFilter,
          vehicleId: vId,
          ...(fuelType && { fuelType: fuelType as any }),
          fullTank: true,
          fueledAt: { lt: startDate },
        },
        orderBy: { fueledAt: 'desc' },
      });

      if (lastPriorFullTank) {
        // Busca todos os abastecimentos desde aquele tanque cheio até o startDate
        const intermediatePrior = await this.prisma.fuelRecord.findMany({
          where: {
            ...clientFilter,
            vehicleId: vId,
            ...(fuelType && { fuelType: fuelType as any }),
            fueledAt: {
              gte: lastPriorFullTank.fueledAt,
              lt: startDate,
            },
          },
          orderBy: [{ fueledAt: 'asc' }, { odometerAtFueling: 'asc' }],
        });
        priorRecords.push(...intermediatePrior);
      }
    }

    // Unifica os registros evitando duplicidades
    const allRecordsMap = new Map<string, any>();
    for (const r of [...priorRecords, ...periodRecords]) {
      allRecordsMap.set(r.id, r);
    }
    const allRecords = Array.from(allRecordsMap.values());

    // Mapeia para CycleFuelingRecord
    const fuelingsForCalc: CycleFuelingRecord[] = allRecords.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      driverId: r.driverId ?? undefined,
      fueledAt: r.fueledAt,
      odometerAtFueling: r.odometerAtFueling,
      liters: r.liters,
      pricePerUnit: r.pricePerUnit,
      totalCost: r.totalCost,
      fuelType: r.fuelType,
      gasStation: r.gasStation,
      fullTank: r.fullTank,
    }));

    // Executa a calculadora pura de ciclos
    const calcResult = this.calculator.calculate({
      fuelings: fuelingsForCalc,
      vehiclePlateMap: vehicleMetaMap,
    });

    // Seção 36 da spec: Um ciclo pertence ao relatório se endDate estiver dentro do período
    const validCyclesInPeriod = calcResult.cycles.filter((c) => {
      const t = new Date(c.endDate).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    });

    // Filtra anomalias ocorridas dentro do período
    const anomaliesInPeriod = calcResult.anomalies.filter((a) => {
      const t = new Date(a.recordedAt).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    });

    // 1. Resumo financeiro e operacional (todos os abastecimentos registrados dentro do período - Seção 16)
    const totalCost = periodRecords.reduce((sum, r) => sum + r.totalCost, 0);
    const totalLiters = periodRecords.reduce((sum, r) => sum + r.liters, 0);
    const fuelingCount = periodRecords.length;
    const weightedSum = periodRecords.reduce((sum, r) => sum + r.liters * r.pricePerUnit, 0);
    const weightedAveragePrice =
      totalLiters > 0 ? Math.round((weightedSum / totalLiters) * 100) / 100 : 0;

    const summary: EfficiencyReportSummary = {
      totalCost: Math.round(totalCost * 100) / 100,
      totalLiters: Math.round(totalLiters * 100) / 100,
      fuelingCount,
      weightedAveragePrice,
    };

    // 2. Eficiência da frota (somente sobre ciclos válidos de tanque cheio - Seção 11 e 17)
    const fleetDistanceKm = validCyclesInPeriod.reduce((sum, c) => sum + c.distanceKm, 0);
    const fleetFuelConsumed = validCyclesInPeriod.reduce((sum, c) => sum + c.fuelConsumed, 0);
    const fleetCyclesCost = validCyclesInPeriod.reduce((sum, c) => sum + c.totalCost, 0);

    const averageKmPerLiter =
      fleetFuelConsumed > 0 && fleetDistanceKm > 0
        ? Math.round((fleetDistanceKm / fleetFuelConsumed) * 100) / 100
        : null;

    const costPerKm =
      fleetDistanceKm > 0
        ? Math.round((fleetCyclesCost / fleetDistanceKm) * 100) / 100
        : null;

    const costPer100Km =
      costPerKm !== null ? Math.round(costPerKm * 100 * 100) / 100 : null;

    const efficiency: EfficiencyReportMetrics = {
      averageKmPerLiter,
      distanceKm: fleetDistanceKm,
      fuelConsumed: Math.round(fleetFuelConsumed * 100) / 100,
      costPerKm,
      costPer100Km,
      validCycles: validCyclesInPeriod.length,
    };

    // 3. Indicador de Qualidade dos Dados (Seção 18)
    const validCycles = validCyclesInPeriod.length;
    let qualityStatus: 'GOOD' | 'PARTIAL' | 'INSUFFICIENT' = 'INSUFFICIENT';
    let qualityMessage = 'Nenhum ciclo de tanque cheio disponível no período.';

    if (validCycles > 0) {
      const recordIdsInCycles = new Set<string>();
      for (const c of validCyclesInPeriod) {
        recordIdsInCycles.add(c.startFuelRecordId);
        recordIdsInCycles.add(c.endFuelRecordId);
        for (const inter of c.intermediateFuelings) {
          recordIdsInCycles.add(inter.id);
        }
      }
      const inPeriodCount = Array.from(recordIdsInCycles).filter((id) =>
        periodRecords.some((r) => r.id === id)
      ).length;
      const ratio = fuelingCount > 0 ? inPeriodCount / fuelingCount : 0;

      if (ratio >= 0.6) {
        qualityStatus = 'GOOD';
        qualityMessage = `${validCycles} ciclo(s) válido(s) em ${fuelingCount} abastecimento(s).`;
      } else {
        qualityStatus = 'PARTIAL';
        qualityMessage = `${validCycles} ciclo(s) válido(s) em ${fuelingCount} abastecimento(s). Abastecimentos parciais frequentes.`;
      }
    }

    // 4. Eficiência por Veículo (Seção 25 e 26)
    const vehicleList = vehicles || [];
    let insufficientVehiclesCount = 0;

    const vehicleEfficiency: EfficiencyVehicleItem[] = vehicleList.map((veh) => {
      const vRecords = periodRecords.filter((r) => r.vehicleId === veh.id);
      const vCycles = validCyclesInPeriod.filter((c) => c.vehicleId === veh.id);
      const fullTanks = vRecords.filter((r) => r.fullTank).length;

      const vDistance = vCycles.reduce((sum, c) => sum + c.distanceKm, 0);
      const vFuel = vCycles.reduce((sum, c) => sum + c.fuelConsumed, 0);
      const vCycleCost = vCycles.reduce((sum, c) => sum + c.totalCost, 0);
      const vTotalSpent = vRecords.reduce((sum, r) => sum + r.totalCost, 0);

      const vAvgKmL =
        vFuel > 0 && vDistance > 0
          ? Math.round((vDistance / vFuel) * 100) / 100
          : null;

      const vCostPerKm =
        vDistance > 0 ? Math.round((vCycleCost / vDistance) * 100) / 100 : null;

      const hasSufficientData = vCycles.length > 0;
      if (!hasSufficientData) {
        insufficientVehiclesCount++;
      }

      let message: string | undefined;
      if (!hasSufficientData) {
        if (fullTanks === 1) {
          message = '1 abastecimento com tanque cheio. É necessário outro para fechar o ciclo de consumo.';
        } else if (fullTanks === 0 && vRecords.length > 0) {
          message = 'Apenas abastecimentos parciais registrados. Marque "Tanque Cheio" para calcular o consumo.';
        } else {
          message = 'São necessários pelo menos dois abastecimentos com "Tanque Cheio" para calcular a eficiência.';
        }
      }

      return {
        vehicleId: veh.id,
        plate: veh.plate,
        model: veh.model,
        brand: veh.brand,
        status: veh.status,
        totalFuelings: vRecords.length,
        fullTankFuelings: fullTanks,
        validCyclesCount: vCycles.length,
        averageKmPerLiter: vAvgKmL,
        totalDistanceKm: vDistance,
        totalFuelConsumed: Math.round(vFuel * 100) / 100,
        totalCost: Math.round(vTotalSpent * 100) / 100,
        costPerKm: vCostPerKm,
        hasSufficientData,
        message,
      };
    });

    const dataQuality: EfficiencyDataQuality = {
      status: qualityStatus,
      totalFuelings: fuelingCount,
      validCycles,
      insufficientVehiclesCount,
      message: qualityMessage,
    };

    // 5. Gráfico 1: Evolução do Consumo (Km/L por ciclo - Seção 20)
    const consumptionEvolution: EfficiencyConsumptionEvolutionPoint[] = validCyclesInPeriod.map(
      (c) => ({
        cycleId: c.id,
        date: c.endDate.toISOString(),
        vehicleId: c.vehicleId,
        vehiclePlate: c.vehiclePlate || 'Veículo',
        kmPerLiter: c.kmPerLiter,
        distanceKm: c.distanceKm,
        fuelConsumed: c.fuelConsumed,
        totalCost: c.totalCost,
      })
    );

    // 6. Gráficos 2, 3 e 4: Agrupamentos Temporais por Dia (Seções 21, 22 e 23)
    const dailyMap = new Map<string, { totalCost: number; totalLiters: number; weightedSum: number }>();
    for (const r of periodRecords) {
      const dayKey = new Date(r.fueledAt).toISOString().slice(0, 10);
      const current = dailyMap.get(dayKey) || { totalCost: 0, totalLiters: 0, weightedSum: 0 };
      current.totalCost += r.totalCost;
      current.totalLiters += r.liters;
      current.weightedSum += r.liters * r.pricePerUnit;
      dailyMap.set(dayKey, current);
    }

    const sortedDays = Array.from(dailyMap.keys()).sort();
    const costEvolution: EfficiencyTimeSeriesPoint[] = [];
    const volumeEvolution: EfficiencyTimeSeriesPoint[] = [];
    const priceEvolution: EfficiencyTimeSeriesPoint[] = [];

    for (const day of sortedDays) {
      const val = dailyMap.get(day)!;
      costEvolution.push({ date: day, value: Math.round(val.totalCost * 100) / 100 });
      volumeEvolution.push({ date: day, value: Math.round(val.totalLiters * 100) / 100 });
      const avgPrice = val.totalLiters > 0 ? Math.round((val.weightedSum / val.totalLiters) * 100) / 100 : 0;
      priceEvolution.push({ date: day, value: avgPrice });
    }

    // 7. Gráfico 5: Distribuição por Combustível (Seção 24)
    const fuelTypeMap = new Map<string, { totalLiters: number; totalCost: number }>();
    for (const r of periodRecords) {
      const key = r.fuelType;
      const current = fuelTypeMap.get(key) || { totalLiters: 0, totalCost: 0 };
      current.totalLiters += r.liters;
      current.totalCost += r.totalCost;
      fuelTypeMap.set(key, current);
    }

    const fuelDistribution: EfficiencyFuelDistributionItem[] = [];
    for (const [fType, val] of fuelTypeMap.entries()) {
      const percentage = totalLiters > 0 ? Math.round((val.totalLiters / totalLiters) * 100 * 10) / 10 : 0;
      fuelDistribution.push({
        fuelType: fType,
        label: FUEL_LABELS[fType] || fType,
        totalLiters: Math.round(val.totalLiters * 100) / 100,
        totalCost: Math.round(val.totalCost * 100) / 100,
        percentage,
      });
    }
    // Ordena do maior volume para o menor
    fuelDistribution.sort((a, b) => b.totalLiters - a.totalLiters);

    return {
      summary,
      efficiency,
      dataQuality,
      vehicleEfficiency,
      consumptionEvolution,
      costEvolution,
      volumeEvolution,
      priceEvolution,
      fuelDistribution,
      consumptionCycles: validCyclesInPeriod,
      anomalies: anomaliesInPeriod,
    };
  }
}
