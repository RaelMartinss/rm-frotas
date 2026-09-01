import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import type { IDriversRepository } from '../../../drivers/domain/repositories/drivers.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';

export interface StartTripInput {
  tripId: string;
}

@Injectable()
export class StartTripUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IVehiclesRepository')
    private readonly vehiclesRepository: IVehiclesRepository,
  ) {}

  async execute({ tripId }: StartTripInput): Promise<Trip> {
    const trip = await this.tripsRepository.findById(tripId);

    if (!trip) {
      throw new TripNotFoundException('Viagem não encontrada.');
    }

    const driver = await this.driversRepository.findById(trip.getDriverId());
    if (!driver) {
      throw new TripNotFoundException('Motorista associado não encontrado.');
    }

   // Regra de Negócio: Impede incio se a CNH estiver vencida
   if (driver.isCnhExpired(new Date())) {
      throw new Error('Não é possível iniciar a viagem: CNH do motorista está vencida.');
   }

    const vehicle = await this.vehiclesRepository.findById(trip.getVehicleId());
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');

    trip.start();
    vehicle.markAsInUse();
    
    await Promise.all([
      this.tripsRepository.save(trip),
      this.vehiclesRepository.save(vehicle),
    ]);

    return trip;
  }
}