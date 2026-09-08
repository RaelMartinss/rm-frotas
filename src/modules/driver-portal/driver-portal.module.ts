import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { DriverPortalController } from './infrastructure/http/driver-portal.controller';
import { GetDriverCurrentTripUseCase } from './application/use-cases/get-driver-current-trip.use-case';
import { GetDriverHistoryUseCase } from './application/use-cases/get-driver-history.use-case';
import { RecordTripLocationUseCase } from './application/use-cases/record-trip-location.use-case';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  controllers: [DriverPortalController],
  providers: [
    GetDriverCurrentTripUseCase,
    GetDriverHistoryUseCase,
    RecordTripLocationUseCase,
  ],
  exports: [
    GetDriverCurrentTripUseCase,
    GetDriverHistoryUseCase,
    RecordTripLocationUseCase,
  ],
})
export class DriverPortalModule {}
