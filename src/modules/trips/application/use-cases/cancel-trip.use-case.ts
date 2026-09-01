import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import type { ITripsRepository } from '../repositories/trips-repository.interface';

interface CancelTripInput {
  tripId: string;
}

@Injectable()
export class CancelTripUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
  ) {}

  async execute({ tripId }: CancelTripInput): Promise<Trip> {
    const trip = await this.tripsRepository.findById(tripId);

    if (!trip) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    // Executa a transição de estado e validações do domínio
    trip.cancel();

    await this.tripsRepository.save(trip);

    return trip;
  }
}