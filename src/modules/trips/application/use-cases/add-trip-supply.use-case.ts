import { Inject, Injectable } from '@nestjs/common';
import type { ITripsRepository } from '../repositories/trips-repository.interface';
import { TripNotFoundException } from '../exceptions/trip-not-found.exception';
import { RegisterFuelRecordUseCase } from '../../../fuel/application/use-cases/register-fuel-record.use-case';
import { FuelRecord } from '../../../fuel/domain/entities/fuel-record.entity';
import { FuelType } from '../../../fuel/domain/enums/fuel-type.enum';

export interface AddTripSupplyInput {
  tripId: string;
  ownerId: string;
  clientId?: string;
  liters: number;
  totalCost?: number;
  pricePerUnit?: number;
  fuelType: FuelType;
  odometerAtFueling: number;
  gasStation?: string | null;
  fullTank?: boolean;
  receiptUrl?: string | null;
  fueledAt?: Date;
  notes?: string | null;
}

@Injectable()
export class AddTripSupplyUseCase {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    private readonly registerFuelRecordUseCase: RegisterFuelRecordUseCase,
  ) {}

  async execute(input: AddTripSupplyInput): Promise<{ fuelRecord: FuelRecord; tripId: string }> {
    const trip = await this.tripsRepository.findById(input.tripId);
    if (!trip) {
      throw new TripNotFoundException('Viagem não encontrada.');
    }

    const clientId = input.clientId || trip.getClientId();

    const fuelRecord = await this.registerFuelRecordUseCase.execute({
      ownerId: input.ownerId,
      clientId,
      vehicleId: trip.getVehicleId(),
      driverId: trip.getDriverId(),
      fuelType: input.fuelType,
      liters: input.liters,
      pricePerUnit: input.pricePerUnit,
      totalCost: input.totalCost,
      odometerAtFueling: input.odometerAtFueling,
      gasStation: input.gasStation,
      fullTank: input.fullTank,
      receiptUrl: input.receiptUrl,
      fueledAt: input.fueledAt,
      notes: input.notes,
    });

    return {
      fuelRecord,
      tripId: trip.getId(),
    };
  }
}
