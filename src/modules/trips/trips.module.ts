import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { DriversModule } from '../drivers/drivers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

// Repositórios
import { PrismaTripsRepository } from './infrastructure/repositories/prisma-trips.repository';

// Casos de Uso
import { CreateTripUseCase } from './application/use-cases/create-trip.use-case';
import { StartTripUseCase } from './application/use-cases/start-trip.use-case';
import { CompleteTripUseCase } from './application/use-cases/complete-trip.use-case';
import { CancelTripUseCase } from './application/use-cases/cancel-trip.use-case';
import { ITripsRepository } from './application/repositories/trips-repository.interface';
import { IDriversRepository } from '../drivers/domain/repositories/drivers.repository';
import { IVehiclesRepository } from '../vehicles/domain/repositories/vehicles.repository';


// Controllers
import { TripsController } from './infrastructure/controllers/trips.controller';

@Module({
  imports: [PrismaModule, DriversModule, VehiclesModule],
  controllers: [TripsController],
  providers: [
    PrismaTripsRepository,
    
    // Provê a interface via Token de Injeção
    {
      provide: 'ITripsRepository',
      useExisting: PrismaTripsRepository,
    },

    // Injeção manual das dependências nos Use Cases
    {
      provide: CreateTripUseCase,
      useFactory: (
        tripsRepo: ITripsRepository,
        driversRepo: IDriversRepository,
        vehiclesRepo: IVehiclesRepository,
      ) => {
        return new CreateTripUseCase(tripsRepo, driversRepo, vehiclesRepo);
      },
      inject: ['ITripsRepository', 'IDriversRepository', IVehiclesRepository],
    },
    {
      provide: StartTripUseCase,
      useFactory: (
        tripsRepo: ITripsRepository,
        driversRepo: IDriversRepository,
        vehiclesRepo: IVehiclesRepository,
      ) => {
        return new StartTripUseCase(tripsRepo, driversRepo, vehiclesRepo);
      },
      inject: ['ITripsRepository', 'IDriversRepository', IVehiclesRepository],
    },
    {
      provide: CompleteTripUseCase,
      useFactory: (
        tripsRepo: ITripsRepository,
        vehiclesRepo: IVehiclesRepository,
      ) => {
        return new CompleteTripUseCase(tripsRepo, vehiclesRepo);
      },
      inject: ['ITripsRepository', IVehiclesRepository],
    },
    {
      provide: CancelTripUseCase,
      useFactory: (
        tripsRepo: ITripsRepository,
        vehiclesRepo: IVehiclesRepository,
      ) => {
        return new CancelTripUseCase(tripsRepo, vehiclesRepo);
      },
      inject: ['ITripsRepository', IVehiclesRepository],
    },
  ],
  exports: [
    CreateTripUseCase,
    StartTripUseCase,
    CompleteTripUseCase,
    CancelTripUseCase,
    'ITripsRepository',
  ],
})
export class TripsModule {}