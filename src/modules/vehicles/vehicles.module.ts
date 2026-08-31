import { Module } from '@nestjs/common';
import { VehiclesController } from './infrastructure/http/controllers/vehicles.controller';
import { CreateVehicleUseCase } from './application/use-cases/create-vehicle.use-case';
import { IVehiclesRepository } from './domain/repositories/vehicles.repository';
import { PrismaVehiclesRepository } from './infrastructure/persistence/prisma/repositories/prisma-vehicles.repository';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { SendVehicleToMaintenanceUseCase } from './application/use-cases/send-vehicle-to-maintenance.use-case';


@Module({
    imports: [PrismaModule],
    controllers: [
        VehiclesController,
    ],
    providers: [
        CreateVehicleUseCase,
        SendVehicleToMaintenanceUseCase,
        {
            provide: IVehiclesRepository,
            useClass: PrismaVehiclesRepository,        
        },
    ],
    exports: [
        IVehiclesRepository,
    ],
})

export class VehiclesModule {}