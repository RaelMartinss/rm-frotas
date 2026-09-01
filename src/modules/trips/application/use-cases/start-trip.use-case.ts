import { Trip } from '../../domain/entities/trip.entity';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import { ITripsRepository } from '../repositories/trips-repository.interface';

export interface StartTripInput {
  tripId: string;
}

export class StartTripUseCase {
  constructor(private readonly tripsRepository: ITripsRepository) {}

  async execute(input: StartTripInput): Promise<Trip> {
    const trip = await this.tripsRepository.findById(input.tripId);

    if (!trip) {
      throw new TripNotFoundException('Viagem não encontrada.');
    }

    // Regra de negócio encapsulada na entidade (dispara exceção de domínio se status for inválido)
    trip.start();

    await this.tripsRepository.save(trip);

    return trip;
  }
}