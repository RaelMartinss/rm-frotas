import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';

export interface CompleteTripInput {
  tripId: string;
}

@Injectable()
export class CompleteTripUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    @Inject('IVehiclesRepository')
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute({ tripId }: { tripId: string }): Promise<Trip> {
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) throw new NotFoundException('Viagem não encontrada.');

    const vehicle = await this.vehiclesRepository.findById(trip.getVehicleId());
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');

    trip.complete();

    // Libera o veículo para novas viagens
    vehicle.markAsAvailable();

    await Promise.all([
      this.tripsRepository.save(trip),
      this.vehiclesRepository.save(vehicle),
    ]);

    return trip;
  }
}