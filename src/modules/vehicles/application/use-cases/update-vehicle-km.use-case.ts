import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";
import { Vehicle } from "../../domain/entities/vehicle.entity";
import { InvalidKilometrageException } from "../../domain/exceptions/invalid-kilometrage.exception";



interface UpdateVehicleKmInput {
    vehicleId: string;
    currentKm: number;
}

@Injectable()
export class UpdateVehicleKmUseCase {
    constructor(
        @Inject(IVehiclesRepository)
        private readonly vehiclesRepository: IVehiclesRepository,
    ) {}

    async execute({ vehicleId, currentKm}: UpdateVehicleKmInput): Promise<Vehicle> {
        const vehicle = await this.vehiclesRepository.findById(vehicleId);

        if (!vehicle) {
            throw new NotFoundException('Veículo não encontrado.');
        }

        try {
            vehicle.updateKm(currentKm);
        } catch (error) {
            if(error instanceof InvalidKilometrageException) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }

        await this.vehiclesRepository.save(vehicle);

        return vehicle
    }
}