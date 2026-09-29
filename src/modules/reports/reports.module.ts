import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { COST_PER_KM_READ_REPOSITORY } from './application/ports/cost-per-km-read-repository.port';
import { REPORT_RENDERERS } from './application/ports/report-renderer.port';
import { ExportCostPerKmQuery } from './application/queries/export-cost-per-km/export-cost-per-km.query';
import { GetCostPerKmQuery } from './application/queries/get-cost-per-km/get-cost-per-km.query';
import { PrismaCostPerKmReadRepository } from './infrastructure/read-repositories/prisma-cost-per-km.read-repository';
import { CostPerKmCsvRenderer } from './infrastructure/renderers/csv/cost-per-km.csv-renderer';
import { CostPerKmPdfRenderer } from './infrastructure/renderers/pdf/cost-per-km.pdf-renderer';
import { ReportRendererRegistry } from './infrastructure/renderers/report-renderer.registry';
import { ReportsController } from './presentation/reports.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    GetCostPerKmQuery,
    ExportCostPerKmQuery,
    CostPerKmCsvRenderer,
    CostPerKmPdfRenderer,
    {
      provide: COST_PER_KM_READ_REPOSITORY,
      useClass: PrismaCostPerKmReadRepository,
    },
    {
      provide: REPORT_RENDERERS,
      useClass: CostPerKmCsvRenderer,
    },
    {
      provide: REPORT_RENDERERS,
      useClass: CostPerKmPdfRenderer,
    },
    {
      provide: ReportRendererRegistry,
      useFactory: (csvRenderer: CostPerKmCsvRenderer, pdfRenderer: CostPerKmPdfRenderer) => {
        return new ReportRendererRegistry([csvRenderer, pdfRenderer]);
      },
      inject: [CostPerKmCsvRenderer, CostPerKmPdfRenderer],
    },
  ],
  exports: [GetCostPerKmQuery, ExportCostPerKmQuery],
})
export class ReportsModule {}
