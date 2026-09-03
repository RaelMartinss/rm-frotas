import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IVehiclesRepository } from '../../domain/repositories/vehicles.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { LicensePlate } from '../../domain/value-objects/license-plate.vo';
import { CreateVehicleInput } from '../inputs/create-vehicle.input';
import { VehicleAlreadyExistsException } from '../../domain/exceptions/vehicle-already-exists.exception';

@Injectable()
export class CreateVehicleUseCase {
  constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

  async execute(input: CreateVehicleInput): Promise<Vehicle> {
    const licensePlate = new LicensePlate(input.plate);

    const vehicleAlreadyExists = await this.vehiclesRepository.findByPlate(licensePlate.getValue());
    if (vehicleAlreadyExists) {
      throw new VehicleAlreadyExistsException(licensePlate.getValue());    
    }

    const vehicle = new Vehicle({
      id: randomUUID(),
      plate: licensePlate,
      model: input.model,
      year: input.year,
      currentKm: input.currentKm,
      ownerId: input.ownerId,
    });

    await this.vehiclesRepository.save(vehicle);

    return vehicle;
  }
}