import { Injectable } from "@nestjs/common";
import { Vehicle } from "../../domain/entities/vehicle.entity";
import { VehicleNotFoundException } from "../../domain/exceptions/vehicle-not-found.exception";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";


export interface SendVehicleToMaintenanceInput {
    vehicleId: string;
}

@Injectable()
export class SendVehicleToMaintenanceUseCase {
    constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

    async execute(input: SendVehicleToMaintenanceInput): Promise<Vehicle> {
        const vehicle = await this.vehiclesRepository.findById(input.vehicleId);

        if (!vehicle) {
            throw new VehicleNotFoundException(input.vehicleId)
        }

        vehicle.sendToMaintenance();

        await this.vehiclesRepository.save(vehicle);

        return vehicle;
    }
}