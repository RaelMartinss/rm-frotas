import { describe, expect, it } from 'vitest';
import { CostPerKmPdfRenderer } from '../cost-per-km.pdf-renderer';
import { CostPerKmReportResponseDto } from '../../../../presentation/dto/cost-per-km-response.dto';
import { ReportRenderContext } from '../../../../application/ports/report-renderer.port';

describe('CostPerKmPdfRenderer', () => {
  const renderer = new CostPerKmPdfRenderer();

  const mockContext: ReportRenderContext = {
    clientName: 'Transportes Exemplo LTDA',
    generatedByName: 'Carlos Gestor',
    generatedAt: new Date('2026-09-28T14:30:00Z'),
    exportId: '12345678-1234-4234-a234-1234567890ab',
  };

  const createReportData = (rowCount: number): CostPerKmReportResponseDto => {
    const rows = Array.from({ length: rowCount }, (_, i) => ({
      vehicleId: `vehicle-${i + 1}`,
      plate: `ABC${i.toString().padStart(4, '0')}`,
      model: `Caminhão V${i + 1}`,
      year: 2020 + (i % 5),
      fuelCost: (1500 + i * 10).toFixed(2),
      maintenanceCost: (500 + i * 5).toFixed(2),
      totalCost: (2000 + i * 15).toFixed(2),
      km: 1000 + i * 20,
      cpk: ((2000 + i * 15) / (1000 + i * 20)).toFixed(2),
      status: i % 3 === 0 ? ('ABOVE_AVERAGE' as const) : ('OK' as const),
      insufficientReason: null,
      deltaVsFleetPercent: i % 3 === 0 ? 25.3 : -5.8,
      deltaVsPreviousPercent: i % 2 === 0 ? 10.1 : -2.4,
    }));

    const eligibleRows = rows.filter((r) => r.status !== 'INSUFFICIENT_DATA');
    const eligibleKm = eligibleRows.reduce((a, r) => a + r.km, 0);
    const eligibleTotalCost = eligibleRows.reduce((a, r) => a + parseFloat(r.totalCost), 0);

    return {
      period: {
        from: '2026-09-01',
        to: '2026-09-28',
        previousFrom: '2026-08-04',
        previousTo: '2026-08-31',
      },
      summary: {
        totalFuelCost: '150000.00',
        totalMaintenanceCost: '50000.00',
        totalCost: '200000.00',
        eligibleKm,
        fleetCpk: eligibleKm > 0 ? (eligibleTotalCost / eligibleKm).toFixed(2) : null,
        fleetComparisonAvailable: rowCount >= 3,
        eligibleVehicles: eligibleRows.length,
        aboveAverageCount: rows.filter((r) => r.status === 'ABOVE_AVERAGE').length,
        insufficientDataCount: 0,
        eligible: {
          vehicles: eligibleRows.length,
          fuelCost: '150000.00',
          maintenanceCost: '50000.00',
          totalCost: '200000.00',
          km: eligibleKm,
          cpk: eligibleKm > 0 ? (eligibleTotalCost / eligibleKm).toFixed(2) : null,
        },
        insufficient: {
          vehicles: 0,
          fuelCost: '0.00',
          maintenanceCost: '0.00',
          totalCost: '0.00',
        },
      },
      rows: rows as any,
      pagination: {
        page: 1,
        pageSize: rowCount,
        totalItems: rowCount,
        totalPages: 1,
      },
    };
  };

  it('deve ter format "pdf" e reportType "cost-per-km"', () => {
    expect(renderer.format).toBe('pdf');
    expect(renderer.reportType).toBe('cost-per-km');
  });

  it('deve renderizar um documento PDF válido com cabeçalho %PDF-', async () => {
    const reportData = createReportData(3);
    const stream = await renderer.render(reportData, mockContext);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    expect(buffer.length).toBeGreaterThan(1000);
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('deve renderizar sem erros quando rows estiver vazio', async () => {
    const reportData = createReportData(0);
    const stream = await renderer.render(reportData, mockContext);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it(
    'deve renderizar 200 linhas gerando um PDF com mais de 50KB',
    async () => {
      const reportData = createReportData(200);
      const startTime = Date.now();

      const stream = await renderer.render(reportData, mockContext);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const duration = Date.now() - startTime;

      expect(buffer.length).toBeGreaterThan(50000);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(duration).toBeLessThan(15000); // margem para execução paralela de toda a suíte
    },
    15000,
  );
});
