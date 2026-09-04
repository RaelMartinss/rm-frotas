import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { DashboardController } from './infrastructure/http/dashboard.controller';
import { GetDashboardSummaryUseCase } from './application/use-cases/get-dashboard-summary.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [GetDashboardSummaryUseCase],
  exports: [GetDashboardSummaryUseCase],
})
export class DashboardModule {}
