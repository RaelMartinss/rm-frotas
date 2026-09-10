import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../../domain/entities/trip.entity';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import { DriverCnhInvalidForTripException } from '../exceptions/driver-cnh-invalid-for-trip.exception';
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

    // Regra de Negócio: Impede início se a CNH estiver vencida ou a <= 1 dia do vencimento
    const daysUntilCnhExpires = driver.getDaysUntilCnhExpires();
    if (driver.isCnhInvalidOrExpiringSoon()) {
      const msg =
        daysUntilCnhExpires < 0
          ? 'Não é possível iniciar a viagem: CNH do motorista está vencida.'
          : daysUntilCnhExpires === 0
          ? 'Não é possível iniciar a viagem: CNH do motorista vence hoje.'
          : 'Não é possível iniciar a viagem: CNH do motorista vence amanhã (bloqueio de segurança em 1 dia).';
      throw new DriverCnhInvalidForTripException(msg);
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