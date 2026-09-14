import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClientsModule } from '../clients/clients.module';
import { IImpersonationSessionsRepository } from './domain/repositories/impersonation-sessions.repository.interface';
import { IAuditLogsRepository } from './domain/repositories/audit-logs.repository.interface';
import { PrismaImpersonationSessionsRepository } from './infrastructure/persistence/prisma/prisma-impersonation-sessions.repository';
import { PrismaAuditLogsRepository } from './infrastructure/persistence/prisma/prisma-audit-logs.repository';
import { StartImpersonationUseCase } from './application/use-cases/start-impersonation.use-case';
import { EndImpersonationUseCase } from './application/use-cases/end-impersonation.use-case';
import { GetActiveImpersonationUseCase } from './application/use-cases/get-active-impersonation.use-case';
import { GetImpersonationAuditLogsUseCase } from './application/use-cases/get-impersonation-audit-logs.use-case';
import { ExpireImpersonationSessionsUseCase } from './application/use-cases/expire-impersonation-sessions.use-case';
import { ExpireImpersonationSessionsJob } from './infrastructure/jobs/expire-impersonation-sessions.job';
import { SupportController } from './infrastructure/http/controllers/support.controller';
import { ImpersonationScopeGuard } from './infrastructure/http/guards/impersonation-scope.guard';
import { ImpersonationAuditInterceptor } from './infrastructure/http/interceptors/impersonation-audit.interceptor';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    forwardRef(() => ClientsModule),
  ],
  controllers: [SupportController],
  providers: [
    {
      provide: IImpersonationSessionsRepository,
      useClass: PrismaImpersonationSessionsRepository,
    },
    {
      provide: IAuditLogsRepository,
      useClass: PrismaAuditLogsRepository,
    },
    StartImpersonationUseCase,
    EndImpersonationUseCase,
    GetActiveImpersonationUseCase,
    GetImpersonationAuditLogsUseCase,
    ExpireImpersonationSessionsUseCase,
    ExpireImpersonationSessionsJob,
    ImpersonationScopeGuard,
    ImpersonationAuditInterceptor,
    {
      provide: APP_GUARD,
      useClass: ImpersonationScopeGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ImpersonationAuditInterceptor,
    },
  ],
  exports: [
    IImpersonationSessionsRepository,
    IAuditLogsRepository,
    StartImpersonationUseCase,
    EndImpersonationUseCase,
    GetActiveImpersonationUseCase,
  ],
})
export class ImpersonationModule {}
