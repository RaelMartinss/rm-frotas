import { Injectable } from "@nestjs/common";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";
import { Vehicle } from "../../domain/entities/vehicle.entity";
import { VehicleNotFoundException } from "../../domain/exceptions/vehicle-not-found.exception";

@Injectable()
export class FindVehicleByIdUseCase {
    constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

    async execute(id: string): Promise<Vehicle> {
        const vehicle = await this. vehiclesRepository.findById(id);

        if (!vehicle){
            throw new VehicleNotFoundException(id);
        }

        return vehicle;
    }
}