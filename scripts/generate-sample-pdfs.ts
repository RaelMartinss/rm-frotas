import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { CostPerKmPdfRenderer } from '../src/modules/reports/infrastructure/renderers/pdf/cost-per-km.pdf-renderer';
import { PrismaCostPerKmReadRepository } from '../src/modules/reports/infrastructure/read-repositories/prisma-cost-per-km.read-repository';
import { GetCostPerKmQuery } from '../src/modules/reports/application/queries/get-cost-per-km/get-cost-per-km.query';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { ReportRenderContext } from '../src/modules/reports/application/ports/report-renderer.port';
import { CostPerKmReportResponseDto } from '../src/modules/reports/presentation/dto/cost-per-km-response.dto';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function main() {
  console.log('📄 Gerando amostras de PDF para demonstração e conferência...');

  const prisma = new PrismaService();
  await prisma.$connect();

  const readRepo = new PrismaCostPerKmReadRepository(prisma);
  const getCostPerKmQuery = new GetCostPerKmQuery(readRepo, prisma);
  const pdfRenderer = new CostPerKmPdfRenderer();

  // 1. Busca cliente padrão
  const client = await prisma.client.findFirst({
    where: { document: '12345678000195' },
  });

  if (!client) {
    throw new Error('Cliente padrão não encontrado. Execute npm run seed:reports antes.');
  }

  // 2. Amostra 1: Dados reais do banco com os 15 veículos semeados (Setembro/2026)
  console.log('📊 1. Consultando dados reais dos 15 veículos no banco de dados...');
  const report15 = await getCostPerKmQuery.execute({
    clientId: client.id,
    from: '2026-09-01',
    to: '2026-09-28',
    unpaginated: true,
  });

  const context15: ReportRenderContext = {
    clientName: client.tradeName || client.legalName,
    generatedByName: 'Rael Martins (Gestor de Frota)',
    generatedAt: new Date('2026-09-28T23:30:00-03:00'),
    exportId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  };

  console.log('🖨️  Renderizando PDF dos 15 veículos...');
  const start15 = Date.now();
  const stream15 = await pdfRenderer.render(report15, context15);
  const buffer15 = await streamToBuffer(stream15);
  const dur15 = Date.now() - start15;

  const out15Path = path.resolve(process.cwd(), 'sample-relatorio-custo-km-15-veiculos.pdf');
  fs.writeFileSync(out15Path, buffer15);
  console.log(`✅ Salvo: ${out15Path} (${(buffer15.length / 1024).toFixed(1)} KB, renderizado em ${dur15}ms)`);

  // 3. Amostra 2: Relatório com 200 veículos (demonstrativo de paginação, cabeçalho repetido e totals)
  console.log('📊 2. Gerando dataset realista com 200 veículos para teste de paginação...');
  const rows200 = Array.from({ length: 200 }, (_, i) => {
    const isAbove = i % 10 === 0; // 10% acima da média
    const isLowKm = i === 15;
    const isRegression = i === 25;
    const isNoReadings = i === 35;

    const baseFuel = 8000 + (i % 7) * 900;
    const baseMaint = isAbove ? 7500 : 1200 + (i % 5) * 350;
    const totalCost = baseFuel + baseMaint;
    const kmTraveled = isLowKm ? 50 : isRegression || isNoReadings ? 0 : 3500 + (i % 8) * 400;

    let status: 'OK' | 'ABOVE_AVERAGE' | 'INSUFFICIENT_DATA' = 'OK';
    let reason: any = null;
    let cpk: number | null = +(totalCost / kmTraveled).toFixed(2);
    let deltaFleet: number | null = null;
    let deltaPrev: number | null = (i % 3 === 0 ? 1 : -1) * +((i % 15) * 1.8).toFixed(1);

    if (isLowKm) {
      status = 'INSUFFICIENT_DATA';
      reason = 'LOW_KM';
      cpk = null;
      deltaPrev = null;
    } else if (isRegression) {
      status = 'INSUFFICIENT_DATA';
      reason = 'KM_REGRESSION';
      cpk = null;
      deltaPrev = null;
    } else if (isNoReadings) {
      status = 'INSUFFICIENT_DATA';
      reason = 'NO_READINGS';
      cpk = null;
      deltaPrev = null;
    } else if (isAbove) {
      status = 'ABOVE_AVERAGE';
      deltaFleet = 28.5 + (i % 5);
    } else {
      deltaFleet = -12.4 + (i % 8);
    }

    const models = [
      'Volvo FH 540 6x4 Globetrotter Euro 6',
      'Scania R 450 A6x2 Highline Streamline',
      'Mercedes-Benz Actros 2651 LS 6x4 Megaspace',
      'DAF XF 530 Super Space Cab 6x4',
      'Volkswagen Constellation 24.280 V-Tronic 6x2',
      'Iveco Stralis Hi-Way 560 6x4 Euro 5',
      'Scania P 310 8x2 Bitruck Baú Frigorífico',
      'Mercedes-Benz Axor 3344 Plataforma com Munck Pesado 45T',
    ];

    return {
      vehicleId: `veh-200-${i + 1}`,
      plate: `BRA${(i + 10).toString().padStart(2, '0')}E${(i % 10).toString()}`,
      model: models[i % models.length],
      year: 2020 + (i % 5),
      fuelCost: baseFuel,
      maintenanceCost: baseMaint,
      totalCost,
      kmTraveled,
      cpk,
      deviationPercent: deltaFleet,
      deltaVsPreviousPercent: deltaPrev,
      status,
      insufficientReason: reason,
    };
  });

  const eligibleRows = rows200.filter((r) => r.status === 'OK' || r.status === 'ABOVE_AVERAGE');
  const sumCost = eligibleRows.reduce((a, b) => a + b.totalCost, 0);
  const sumKm = eligibleRows.reduce((a, b) => a + b.kmTraveled, 0);
  const fleetCpk = +(sumCost / sumKm).toFixed(2);

  const report200: CostPerKmReportResponseDto = {
    period: {
      from: '2026-09-01',
      to: '2026-09-28',
      previousFrom: '2026-08-04',
      previousTo: '2026-08-31',
    },
    summary: {
      fleetCpk: fleetCpk.toFixed(2),
      totalCost: rows200.reduce((a, b) => a + b.totalCost, 0).toFixed(2),
      eligibleKm: sumKm,
      eligibleVehicles: eligibleRows.length,
      aboveAverageCount: rows200.filter((r) => r.status === 'ABOVE_AVERAGE').length,
      insufficientDataCount: rows200.filter((r) => r.status === 'INSUFFICIENT_DATA').length,
      fleetComparisonAvailable: true,
      totalFuelCost: rows200.reduce((a, b) => a + b.fuelCost, 0).toFixed(2),
      totalMaintenanceCost: rows200.reduce((a, b) => a + b.maintenanceCost, 0).toFixed(2),
      eligible: {
        vehicles: eligibleRows.length,
        fuelCost: eligibleRows.reduce((a, b) => a + b.fuelCost, 0).toFixed(2),
        maintenanceCost: eligibleRows.reduce((a, b) => a + b.maintenanceCost, 0).toFixed(2),
        totalCost: sumCost.toFixed(2),
        km: sumKm,
        cpk: sumKm > 0 ? fleetCpk.toFixed(2) : null,
      },
      insufficient: {
        vehicles: rows200.filter((r) => r.status === 'INSUFFICIENT_DATA').length,
        fuelCost: rows200.filter((r) => r.status === 'INSUFFICIENT_DATA').reduce((a, b) => a + b.fuelCost, 0).toFixed(2),
        maintenanceCost: rows200.filter((r) => r.status === 'INSUFFICIENT_DATA').reduce((a, b) => a + b.maintenanceCost, 0).toFixed(2),
        totalCost: rows200.filter((r) => r.status === 'INSUFFICIENT_DATA').reduce((a, b) => a + b.totalCost, 0).toFixed(2),
      },
    },
    rows: rows200.map((r) => ({
      vehicleId: r.vehicleId,
      plate: r.plate,
      model: r.model,
      year: r.year,
      fuelCost: r.fuelCost.toFixed(2),
      maintenanceCost: r.maintenanceCost.toFixed(2),
      totalCost: r.totalCost.toFixed(2),
      km: r.kmTraveled,
      cpk: r.cpk !== null ? r.cpk.toFixed(2) : null,
      deltaVsFleetPercent: r.deviationPercent,
      deltaVsPreviousPercent: r.deltaVsPreviousPercent,
      status: r.status,
      insufficientReason: r.insufficientReason,
    })),
    pagination: {
      page: 1,
      pageSize: 200,
      totalItems: 200,
      totalPages: 1,
    },
  };

  const context200: ReportRenderContext = {
    clientName: client.tradeName || client.legalName,
    generatedByName: 'Rael Martins (Gestor de Frota)',
    generatedAt: new Date('2026-09-28T23:30:00-03:00'),
    exportId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  };

  console.log('🖨️  Renderizando PDF de 200 veículos (múltiplas páginas)...');
  const start200 = Date.now();
  const stream200 = await pdfRenderer.render(report200, context200);
  const buffer200 = await streamToBuffer(stream200);
  const dur200 = Date.now() - start200;

  const out200Path = path.resolve(process.cwd(), 'sample-relatorio-custo-km-200-veiculos.pdf');
  fs.writeFileSync(out200Path, buffer200);
  console.log(`✅ Salvo: ${out200Path} (${(buffer200.length / 1024).toFixed(1)} KB, renderizado em ${dur200}ms)`);

  await prisma.$disconnect();
  console.log('\n🎉 Ambas as amostras de PDF foram geradas com sucesso!');
}

main().catch((err) => {
  console.error('❌ Erro ao gerar PDFs de amostra:', err);
  process.exit(1);
});
