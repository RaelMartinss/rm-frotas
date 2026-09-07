import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { MaintenancesController } from './infrastructure/http/controllers/maintenances.controller';
import { ScheduleMaintenanceUseCase } from './application/use-cases/schedule-maintenance.use-case';
import { StartMaintenanceUseCase } from './application/use-cases/start-maintenance.use-case';
import { FinishMaintenanceUseCase } from './application/use-cases/finish-maintenance.use-case';
import { CancelMaintenanceUseCase } from './application/use-cases/cancel-maintenance.use-case';
import { UpdateMaintenanceUseCase } from './application/use-cases/update-maintenance.use-case';
import { GetMaintenanceByIdUseCase } from './application/use-cases/get-maintenance-by-id.use-case';
import { ListMaintenancesUseCase } from './application/use-cases/list-maintenances.use-case';
import { GetMaintenanceStatsUseCase } from './application/use-cases/get-maintenance-stats.use-case';
import { IMaintenancesRepository } from './domain/repositories/maintenances.repository';
import { PrismaMaintenancesRepository } from './infrastructure/persistence/prisma/repositories/prisma-maintenances.repository';

@Module({
  imports: [PrismaModule, AuthModule, VehiclesModule],
  controllers: [MaintenancesController],
  providers: [
    ScheduleMaintenanceUseCase,
    StartMaintenanceUseCase,
    FinishMaintenanceUseCase,
    CancelMaintenanceUseCase,
    UpdateMaintenanceUseCase,
    GetMaintenanceByIdUseCase,
    ListMaintenancesUseCase,
    GetMaintenanceStatsUseCase,
    {
      provide: IMaintenancesRepository,
      useClass: PrismaMaintenancesRepository,
    },
  ],
  exports: [
    IMaintenancesRepository,
    ScheduleMaintenanceUseCase,
    StartMaintenanceUseCase,
    FinishMaintenanceUseCase,
    CancelMaintenanceUseCase,
    UpdateMaintenanceUseCase,
    GetMaintenanceByIdUseCase,
    ListMaintenancesUseCase,
    GetMaintenanceStatsUseCase,
  ],
})
export class MaintenanceModule {}
