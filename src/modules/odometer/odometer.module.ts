import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import {
  IOdometerReadingsRepository,
  I_ODOMETER_READINGS_REPOSITORY,
} from './domain/repositories/odometer-reading.repository.interface';
import { PrismaOdometerReadingRepository } from './infrastructure/persistence/prisma/repositories/prisma-odometer-reading.repository';
import { RegisterOdometerReadingUseCase } from './application/use-cases/register-odometer-reading.use-case';
import { CorrectOdometerReadingUseCase } from './application/use-cases/correct-odometer-reading.use-case';
import { GetVehicleOdometerHistoryUseCase } from './application/use-cases/get-vehicle-odometer-history.use-case';
import { GetCurrentOdometerUseCase } from './application/use-cases/get-current-odometer.use-case';
import { OdometerController } from './infrastructure/http/controllers/odometer.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [VehiclesModule],
  controllers: [OdometerController],
  providers: [
    PrismaService,
    {
      provide: IOdometerReadingsRepository,
      useClass: PrismaOdometerReadingRepository,
    },
    {
      provide: I_ODOMETER_READINGS_REPOSITORY,
      useClass: PrismaOdometerReadingRepository,
    },
    RegisterOdometerReadingUseCase,
    CorrectOdometerReadingUseCase,
    GetVehicleOdometerHistoryUseCase,
    GetCurrentOdometerUseCase,
  ],
  exports: [
    IOdometerReadingsRepository,
    I_ODOMETER_READINGS_REPOSITORY,
    RegisterOdometerReadingUseCase,
    CorrectOdometerReadingUseCase,
    GetVehicleOdometerHistoryUseCase,
    GetCurrentOdometerUseCase,
  ],
})
export class OdometerModule {}
