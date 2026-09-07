import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IFuelRecordsRepository } from '../../domain/repositories/fuel-records.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import type { IDriversRepository } from '../../../drivers/domain/repositories/drivers.repository';
import { FuelRecord } from '../../domain/entities/fuel-record.entity';
import { FuelType } from '../../domain/enums/fuel-type.enum';
import { VehicleOdometerValidator } from '../../../../shared/domain/services/vehicle-odometer.validator';

export interface RegisterFuelRecordInput {
  ownerId: string;
  vehicleId: string;
  driverId: string;
  fuelType: FuelType;
  liters: number;
  pricePerUnit?: number;
  totalCost?: number;
  odometerAtFueling: number;
  gasStation?: string | null;
  fullTank?: boolean;
  receiptUrl?: string | null;
  fueledAt?: Date;
  notes?: string | null;
}

@Injectable()
export class RegisterFuelRecordUseCase {
  constructor(
    private readonly fuelRecordsRepository: IFuelRecordsRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository
  ) {}

  async execute(input: RegisterFuelRecordInput): Promise<FuelRecord> {
    // 1. Validar Veículo
    const vehicle = await this.vehiclesRepository.findById(input.vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    // 2. Validar Motorista
    const driver = await this.driversRepository.findById(input.driverId);
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado.');
    }

    // 3. Buscar último abastecimento do veículo para validação de consistência
    const lastRecord = await this.fuelRecordsRepository.findLastByVehicle(input.vehicleId);

    // 4. Validar Odômetro com o validador de domínio compartilhado
    VehicleOdometerValidator.validate({
      newOdometer: input.odometerAtFueling,
      currentVehicleKm: vehicle.getCurrentKm(),
      lastRecordOdometer: lastRecord ? lastRecord.getOdometerAtFueling() : null,
      contextName: 'Abastecimento',
    });

    // 5. Instanciar Entidade de Domínio
    const fuelRecord = new FuelRecord({
      ownerId: input.ownerId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
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

    // 6. Atualizar a quilometragem do veículo se o odômetro informado for superior
    if (input.odometerAtFueling > vehicle.getCurrentKm()) {
      vehicle.updateKm(input.odometerAtFueling);
      await this.vehiclesRepository.save(vehicle);
    }

    // 7. Persistir Registro
    await this.fuelRecordsRepository.save(fuelRecord);

    return fuelRecord;
  }
}
