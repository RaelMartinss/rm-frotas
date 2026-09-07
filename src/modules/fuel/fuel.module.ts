import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DriversModule } from '../drivers/drivers.module';

import { FuelRecordsController } from './infrastructure/http/controllers/fuel-records.controller';
import { RegisterFuelRecordUseCase } from './application/use-cases/register-fuel-record.use-case';
import { UpdateFuelRecordUseCase } from './application/use-cases/update-fuel-record.use-case';
import { DeleteFuelRecordUseCase } from './application/use-cases/delete-fuel-record.use-case';
import { GetFuelRecordByIdUseCase } from './application/use-cases/get-fuel-record-by-id.use-case';
import { ListFuelRecordsUseCase } from './application/use-cases/list-fuel-records.use-case';
import { GetFuelConsumptionReportUseCase } from './application/use-cases/get-fuel-consumption-report.use-case';
import { GetFuelCostStatsUseCase } from './application/use-cases/get-fuel-cost-stats.use-case';

import { IFuelRecordsRepository } from './domain/repositories/fuel-records.repository';
import { PrismaFuelRecordsRepository } from './infrastructure/persistence/prisma/repositories/prisma-fuel-records.repository';

@Module({
  imports: [PrismaModule, AuthModule, VehiclesModule, DriversModule],
  controllers: [FuelRecordsController],
  providers: [
    RegisterFuelRecordUseCase,
    UpdateFuelRecordUseCase,
    DeleteFuelRecordUseCase,
    GetFuelRecordByIdUseCase,
    ListFuelRecordsUseCase,
    GetFuelConsumptionReportUseCase,
    GetFuelCostStatsUseCase,
    {
      provide: IFuelRecordsRepository,
      useClass: PrismaFuelRecordsRepository,
    },
  ],
  exports: [
    IFuelRecordsRepository,
    RegisterFuelRecordUseCase,
    UpdateFuelRecordUseCase,
    DeleteFuelRecordUseCase,
    GetFuelRecordByIdUseCase,
    ListFuelRecordsUseCase,
    GetFuelConsumptionReportUseCase,
    GetFuelCostStatsUseCase,
  ],
})
export class FuelModule {}
