import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FuelEfficiencyReportService } from '../fuel-efficiency-report.service';

describe('FuelEfficiencyReportService', () => {
  let service: FuelEfficiencyReportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      vehicle: {
        findMany: vi.fn(),
      },
      fuelRecord: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    service = new FuelEfficiencyReportService(mockPrisma);
  });

  it('deve gerar o relatório completo com resumo financeiro, qualidade e eficiência', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v1',
        plate: 'ABC1234',
        model: 'Strada',
        brand: 'Fiat',
        status: 'AVAILABLE',
      },
    ]);

    const startDate = new Date('2026-09-01T00:00:00Z');
    const endDate = new Date('2026-09-30T23:59:59Z');

    // Abastecimentos no período: 2 tanques cheios formando 1 ciclo
    mockPrisma.fuelRecord.findMany.mockResolvedValue([
      {
        id: 'r1',
        vehicleId: 'v1',
        driverId: 'd1',
        fueledAt: new Date('2026-09-02T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        gasStation: 'Posto Shell',
        fullTank: true,
      },
      {
        id: 'r2',
        vehicleId: 'v1',
        driverId: 'd1',
        fueledAt: new Date('2026-09-10T10:00:00Z'),
        odometerAtFueling: 10250,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        gasStation: 'Posto Ipiranga',
        fullTank: true,
      },
    ]);

    mockPrisma.fuelRecord.findFirst.mockResolvedValue(null);

    const report = await service.getEfficiencyReport({
      ownerId: 'owner-1',
      startDate,
      endDate,
    });

    expect(report.period.startDate).toBe(startDate.toISOString());
    expect(report.period.endDate).toBe(endDate.toISOString());

    // Resumo financeiro (todos os abastecimentos do período)
    expect(report.summary.totalCost).toBe(600);
    expect(report.summary.totalLiters).toBe(100);
    expect(report.summary.fuelingCount).toBe(2);
    expect(report.summary.weightedAveragePrice).toBe(6.0);

    // Eficiência (somente sobre o ciclo r1 -> r2)
    // Distância: 250 km, Litros consumidos no ciclo: 50 L => 5.00 km/L
    expect(report.efficiency.validCycles).toBe(1);
    expect(report.efficiency.distanceKm).toBe(250);
    expect(report.efficiency.fuelConsumed).toBe(50);
    expect(report.efficiency.averageKmPerLiter).toBe(5.0);
    expect(report.efficiency.costPerKm).toBe(1.2); // 300 / 250 = 1.20
    expect(report.efficiency.costPer100Km).toBe(120.0);

    // Qualidade dos dados
    expect(report.dataQuality.status).toBe('GOOD');
    expect(report.dataQuality.validCycles).toBe(1);

    // Eficiência por veículo
    expect(report.vehicleEfficiency).toHaveLength(1);
    expect(report.vehicleEfficiency[0].hasSufficientData).toBe(true);
    expect(report.vehicleEfficiency[0].plate).toBe('ABC1234');
    expect(report.vehicleEfficiency[0].averageKmPerLiter).toBe(5.0);

    // Gráficos
    expect(report.consumptionEvolution).toHaveLength(1);
    expect(report.costEvolution.length).toBeGreaterThanOrEqual(1);
    expect(report.fuelDistribution).toHaveLength(1);
    expect(report.fuelDistribution[0].fuelType).toBe('GASOLINA');
  });

  it('deve identificar dados insuficientes se houver apenas um tanque cheio', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v1',
        plate: 'ABC1234',
        model: 'Strada',
        brand: 'Fiat',
        status: 'AVAILABLE',
      },
    ]);

    mockPrisma.fuelRecord.findMany.mockResolvedValue([
      {
        id: 'r1',
        vehicleId: 'v1',
        driverId: 'd1',
        fueledAt: new Date('2026-09-02T10:00:00Z'),
        odometerAtFueling: 10000,
        liters: 50,
        pricePerUnit: 6.0,
        totalCost: 300,
        fuelType: 'GASOLINA',
        gasStation: 'Posto Shell',
        fullTank: true,
      },
    ]);

    mockPrisma.fuelRecord.findFirst.mockResolvedValue(null);

    const report = await service.getEfficiencyReport({
      ownerId: 'owner-1',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
    });

    expect(report.efficiency.validCycles).toBe(0);
    expect(report.efficiency.averageKmPerLiter).toBeNull();
    expect(report.dataQuality.status).toBe('INSUFFICIENT');
    expect(report.vehicleEfficiency[0].hasSufficientData).toBe(false);
    expect(report.vehicleEfficiency[0].message).toContain('1 abastecimento com tanque cheio');
  });
});
