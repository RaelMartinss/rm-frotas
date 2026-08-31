import { Injectable } from "@nestjs/common";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";
import { Vehicle } from "../../domain/entities/vehicle.entity";


@Injectable()
export class ListVehiclesUseCase {
    constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

    async execute(): Promise<Vehicle[]> {
        return this.vehiclesRepository.findAll();
    }
}