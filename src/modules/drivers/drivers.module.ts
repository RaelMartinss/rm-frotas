import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// Repositórios e Mappers
import { PrismaDriversRepository } from './infrastructure/repositories/prisma-drivers.repository';

// Use Cases
import { CreateDriverUseCase } from './application/use-cases/create-driver.use-case';
import { ActivateDriverUseCase } from './application/use-cases/activate-driver.use-case';
import { DeactivateDriverUseCase } from './application/use-cases/deactivate-driver.use-case';
import { SuspendDriverUseCase } from './application/use-cases/suspend-driver.use-case';
import { UpdateDriverCnhUseCase } from './application/use-cases/update-driver-cnh.use-case';

import { DriversController } from './infrastructure/controllers/drivers.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DriversController],
  providers: [
    {
      provide: 'IDriversRepository',
      useClass: PrismaDriversRepository,
    },
    // Casos de Uso
    CreateDriverUseCase,
    ActivateDriverUseCase,
    DeactivateDriverUseCase,
    SuspendDriverUseCase,
    UpdateDriverCnhUseCase,
  ],
  exports: [
    'IDriversRepository',
    CreateDriverUseCase,
    ActivateDriverUseCase,
    DeactivateDriverUseCase,
    SuspendDriverUseCase,
    UpdateDriverCnhUseCase,
  ],
})
export class DriversModule {}