import { Injectable } from "@nestjs/common";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";
import { Vehicle } from "../../domain/entities/vehicle.entity";
import { VehicleNotFoundException } from "../../domain/exceptions/vehicle-not-found.exception";


@Injectable()
export class FindVehicleByPlateUseCase {
    constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

    async execute(plate: string): Promise<Vehicle> {
        const vehicle = await this.vehiclesRepository.findByPlate(plate);

        if (!vehicle) {
            throw new VehicleNotFoundException(plate);
        }

        return vehicle;
    }
}