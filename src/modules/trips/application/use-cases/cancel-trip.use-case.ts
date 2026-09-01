import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';

interface CancelTripInput {
  tripId: string;
}

@Injectable()
export class CancelTripUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    @Inject('IVehiclesRepository')
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute({ tripId }: CancelTripInput): Promise<Trip> {
    const trip = await this.tripsRepository.findById(tripId);

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    const vehicle = await this.vehiclesRepository.findById(trip.getVehicleId());

    if (!vehicle) {
      throw new NotFoundException('Veículo associado à viagem não encontrado.');
    }

    // Altera o estado da viagem executando as validações de domínio
    trip.cancel();

    // Garante que o veículo fique disponível para novas alocações
    vehicle.markAsAvailable();

    // Persiste as atualizações das duas entidades
    await Promise.all([
      this.tripsRepository.save(trip),
      this.vehiclesRepository.save(vehicle),
    ]);

    return trip;
  }
}