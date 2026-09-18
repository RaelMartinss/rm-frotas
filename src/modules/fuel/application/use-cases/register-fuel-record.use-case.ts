import { Injectable, Inject, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { IFuelRecordsRepository } from '../../domain/repositories/fuel-records.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import type { IDriversRepository } from '../../../drivers/domain/repositories/drivers.repository';
import { FuelRecord } from '../../domain/entities/fuel-record.entity';
import { FuelType } from '../../domain/enums/fuel-type.enum';
import { VehicleOdometerValidator } from '../../../../shared/domain/services/vehicle-odometer.validator';
import { RegisterOdometerReadingUseCase } from '../../../odometer/application/use-cases/register-odometer-reading.use-case';
import { OdometerSource } from '../../../odometer/domain/value-objects/odometer-source.vo';

export interface RegisterFuelRecordInput {
  ownerId: string;
  clientId?: string;
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
    private readonly driversRepository: IDriversRepository,
    @Optional()
    private readonly registerOdometerReadingUseCase?: RegisterOdometerReadingUseCase,
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

    const resolvedClientId = input.clientId || vehicle.getClientId() || driver.getClientId?.();

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
      clientId: resolvedClientId,
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

    // 6. Persistir Registro
    await this.fuelRecordsRepository.save(fuelRecord);

    // 7. Registrar Leitura no módulo centralizado de Odômetro (ou atualizar diretamente se use-case não injetado)
    if (this.registerOdometerReadingUseCase) {
      await this.registerOdometerReadingUseCase.execute({
        vehicleId: input.vehicleId,
        clientId: vehicle.getClientId() ?? 'default-client',
        ownerId: input.ownerId,
        currentKm: input.odometerAtFueling,
        source: OdometerSource.FUEL,
        sourceId: fuelRecord.getId(),
        recordedAt: input.fueledAt ?? new Date(),
      });
    } else if (input.odometerAtFueling > vehicle.getCurrentKm()) {
      vehicle.updateKm(input.odometerAtFueling);
      await this.vehiclesRepository.save(vehicle);
    }

    return fuelRecord;
  }
}
