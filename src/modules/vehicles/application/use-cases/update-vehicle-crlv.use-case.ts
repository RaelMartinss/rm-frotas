import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IVehiclesRepository } from '../../domain/repositories/vehicles.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';

interface UpdateVehicleCrlvInput {
  vehicleId: string;
  crlvExpiration: string | Date | null;
}

@Injectable()
export class UpdateVehicleCrlvUseCase {
  constructor(
    @Inject(IVehiclesRepository)
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute({ vehicleId, crlvExpiration }: UpdateVehicleCrlvInput): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findById(vehicleId);

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    const expirationDate = crlvExpiration ? new Date(crlvExpiration) : null;
    vehicle.updateCrlvExpiration(expirationDate);

    await this.vehiclesRepository.save(vehicle);

    return vehicle;
  }
}
