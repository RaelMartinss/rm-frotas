import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { RegisterOdometerReadingUseCase } from '../../../odometer/application/use-cases/register-odometer-reading.use-case';
import { OdometerSource } from '../../../odometer/domain/value-objects/odometer-source.vo';

export interface CompleteTripInput {
  tripId: string;
  finalOdometer?: number;
  ownerId?: string;
}

@Injectable()
export class CompleteTripUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    @Inject('IVehiclesRepository')
    private readonly vehiclesRepository: IVehiclesRepository,
    @Optional()
    private readonly registerOdometerReadingUseCase?: RegisterOdometerReadingUseCase,
  ) {}

  async execute(input: CompleteTripInput): Promise<Trip> {
    const trip = await this.tripsRepository.findById(input.tripId);
    if (!trip) throw new TripNotFoundException('Viagem não encontrada.');

    const vehicle = await this.vehiclesRepository.findById(trip.getVehicleId());
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');

    if (input.finalOdometer !== undefined && this.registerOdometerReadingUseCase) {
      await this.registerOdometerReadingUseCase.execute({
        vehicleId: trip.getVehicleId(),
        clientId: trip.getClientId() ?? vehicle.getClientId() ?? 'default-client',
        ownerId: input.ownerId ?? trip.getDriverId(),
        currentKm: input.finalOdometer,
        source: OdometerSource.TRIP,
        sourceId: trip.getId(),
      });
      if (input.finalOdometer > vehicle.getCurrentKm()) {
        vehicle.updateKm(input.finalOdometer);
      }
    }

    trip.complete(input.finalOdometer);

    // Libera o veículo para novas viagens
    vehicle.markAsAvailable();

    await Promise.all([
      this.tripsRepository.save(trip),
      this.vehiclesRepository.save(vehicle),
    ]);

    return trip;
  }
}