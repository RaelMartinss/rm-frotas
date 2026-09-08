import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { IClientsRepository } from './domain/repositories/clients.repository.interface';
import { PrismaClientsRepository } from './infrastructure/repositories/prisma-clients.repository';
import { OnboardClientUseCase } from './application/use-cases/onboard-client.use-case';
import { ListAllClientsUseCase } from './application/use-cases/list-all-clients.use-case';
import { GetClientByIdUseCase } from './application/use-cases/get-client-by-id.use-case';
import { UpdateClientProfileUseCase } from './application/use-cases/update-client-profile.use-case';
import { SuspendClientUseCase } from './application/use-cases/suspend-client.use-case';
import { ReactivateClientUseCase } from './application/use-cases/reactivate-client.use-case';
import { CancelClientUseCase } from './application/use-cases/cancel-client.use-case';
import { ClientsController } from './infrastructure/controllers/clients.controller';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => AuthModule),
  ],
  controllers: [ClientsController],
  providers: [
    {
      provide: IClientsRepository,
      useClass: PrismaClientsRepository,
    },
    OnboardClientUseCase,
    ListAllClientsUseCase,
    GetClientByIdUseCase,
    UpdateClientProfileUseCase,
    SuspendClientUseCase,
    ReactivateClientUseCase,
    CancelClientUseCase,
  ],
  exports: [IClientsRepository],
})
export class ClientsModule {}
