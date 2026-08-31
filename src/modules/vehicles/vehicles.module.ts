import { Module } from '@nestjs/common';
import { VehiclesController } from './infrastructure/http/controllers/vehicles.controller';
import { CreateVehicleUseCase } from './application/use-cases/create-vehicle.use-case';
import { IVehiclesRepository } from './domain/repositories/vehicles.repository';
import { PrismaVehiclesRepository } from './infrastructure/persistence/prisma/repositories/prisma-vehicles.repository';


@Module({
    controllers: [
        VehiclesController,
    ],
    providers: [
        CreateVehicleUseCase,
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