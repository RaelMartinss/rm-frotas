import { Trip } from '../../domain/entities/trip.entity';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import { ITripsRepository } from '../repositories/trips-repository.interface';

export interface CompleteTripInput {
  tripId: string;
}

export class CompleteTripUseCase {
  constructor(private readonly tripsRepository: ITripsRepository) {}

  async execute(input: CompleteTripInput): Promise<Trip> {
    const trip = await this.tripsRepository.findById(input.tripId);

    if (!trip) {
      throw new TripNotFoundException('Viagem não encontrada.');
    }

    // Regra de negócio encapsulada na entidade (dispara exceção de domínio se status não for IN_PROGRESS)
    trip.complete();

    await this.tripsRepository.save(trip);

    return trip;
  }
}