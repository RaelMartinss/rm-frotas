import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { DriverPortalController } from './infrastructure/http/driver-portal.controller';
import { IncidentsController } from './infrastructure/http/incidents.controller';
import { GetDriverCurrentTripUseCase } from './application/use-cases/get-driver-current-trip.use-case';
import { GetDriverHistoryUseCase } from './application/use-cases/get-driver-history.use-case';
import { RecordTripLocationUseCase } from './application/use-cases/record-trip-location.use-case';
import { GetDriverFuelHistoryUseCase } from './application/use-cases/get-driver-fuel-history.use-case';
import { UpdateDriverFuelReceiptUseCase } from './application/use-cases/update-driver-fuel-receipt.use-case';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
  ],
  controllers: [DriverPortalController, IncidentsController],
  providers: [
    GetDriverCurrentTripUseCase,
    GetDriverHistoryUseCase,
    RecordTripLocationUseCase,
    GetDriverFuelHistoryUseCase,
    UpdateDriverFuelReceiptUseCase,
  ],
  exports: [
    GetDriverCurrentTripUseCase,
    GetDriverHistoryUseCase,
    RecordTripLocationUseCase,
    GetDriverFuelHistoryUseCase,
    UpdateDriverFuelReceiptUseCase,
  ],
})
export class DriverPortalModule {}
