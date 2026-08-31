import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";
import { Vehicle } from "../../domain/entities/vehicle.entity";
import { VehicleAlreadyInMaintenanceException } from "../../domain/exceptions/vehicle-status.exception";

interface FinishVehicleMaintenanceInput {
    vehicleId: string;
}

@Injectable()
export class FinishVehicleMaintenanceUseCase {
    constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

    async execute({ vehicleId }: FinishVehicleMaintenanceInput): Promise<Vehicle> {
        const vehicle = await this.vehiclesRepository.findById(vehicleId);

        if (!vehicle) {
            throw new NotFoundException('Veículo não encontrado.');
        }

        try {
            vehicle.finishMaintenance();
        } catch (error ) {
            if (error instanceof VehicleAlreadyInMaintenanceException) {
                throw new UnprocessableEntityException(error.message);
            }
            throw error;
        }

        await this.vehiclesRepository.save(vehicle);

        return vehicle;
    }
}