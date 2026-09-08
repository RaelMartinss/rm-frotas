import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// Repositórios e Mappers
import { PrismaDriversRepository } from './infrastructure/repositories/prisma-drivers.repository';
import { PrismaDriverSuspensionsRepository } from './infrastructure/repositories/prisma-driver-suspensions.repository';

// Domain Services
import { DriverAvailabilityChecker } from './domain/services/driver-availability-checker.service';

// Use Cases
import { CreateDriverUseCase } from './application/use-cases/create-driver.use-case';
import { ResetDriverPasswordUseCase } from './application/use-cases/reset-driver-password.use-case';
import { ActivateDriverUseCase } from './application/use-cases/activate-driver.use-case';
import { DeactivateDriverUseCase } from './application/use-cases/deactivate-driver.use-case';
import { SuspendDriverUseCase } from './application/use-cases/suspend-driver.use-case';
import { LiftDriverSuspensionUseCase } from './application/use-cases/lift-driver-suspension.use-case';
import { GetActiveSuspensionByDriverUseCase } from './application/use-cases/get-active-suspension-by-driver.use-case';
import { ListSuspensionsByDriverUseCase } from './application/use-cases/list-suspensions-by-driver.use-case';
import { ListActiveSuspensionsUseCase } from './application/use-cases/list-active-suspensions.use-case';
import { UpdateDriverCnhUseCase } from './application/use-cases/update-driver-cnh.use-case';
import { ListDriversUseCase } from './application/use-cases/list-drivers.use-case';
import { FindDriverByIdUseCase } from './application/use-cases/find-driver-by-id.use-case';

import { DriversController } from './infrastructure/controllers/drivers.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DriversController],
  providers: [
    {
      provide: 'IDriversRepository',
      useClass: PrismaDriversRepository,
    },
    {
      provide: 'IDriverSuspensionsRepository',
      useClass: PrismaDriverSuspensionsRepository,
    },
    DriverAvailabilityChecker,
    // Casos de Uso
    CreateDriverUseCase,
    ResetDriverPasswordUseCase,
    ActivateDriverUseCase,
    DeactivateDriverUseCase,
    SuspendDriverUseCase,
    LiftDriverSuspensionUseCase,
    GetActiveSuspensionByDriverUseCase,
    ListSuspensionsByDriverUseCase,
    ListActiveSuspensionsUseCase,
    UpdateDriverCnhUseCase,
    ListDriversUseCase,
    FindDriverByIdUseCase,
  ],
  exports: [
    'IDriversRepository',
    'IDriverSuspensionsRepository',
    DriverAvailabilityChecker,
    CreateDriverUseCase,
    ResetDriverPasswordUseCase,
    ActivateDriverUseCase,
    DeactivateDriverUseCase,
    SuspendDriverUseCase,
    LiftDriverSuspensionUseCase,
    GetActiveSuspensionByDriverUseCase,
    ListSuspensionsByDriverUseCase,
    ListActiveSuspensionsUseCase,
    UpdateDriverCnhUseCase,
    ListDriversUseCase,
    FindDriverByIdUseCase,
  ],
})
export class DriversModule {}