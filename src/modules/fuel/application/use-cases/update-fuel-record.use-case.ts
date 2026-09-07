import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IFuelRecordsRepository } from '../../domain/repositories/fuel-records.repository';
import { FuelRecord } from '../../domain/entities/fuel-record.entity';
import { FuelType } from '../../domain/enums/fuel-type.enum';

export interface UpdateFuelRecordInput {
  id: string;
  ownerId: string;
  driverId?: string; // Se fornecido (motorista logado), restringe a edição apenas ao seu registro
  fuelType?: FuelType;
  liters?: number;
  pricePerUnit?: number;
  totalCost?: number;
  gasStation?: string | null;
  fullTank?: boolean;
  receiptUrl?: string | null;
  fueledAt?: Date;
  notes?: string | null;
}

@Injectable()
export class UpdateFuelRecordUseCase {
  constructor(private readonly fuelRecordsRepository: IFuelRecordsRepository) {}

  async execute(input: UpdateFuelRecordInput): Promise<FuelRecord> {
    const fuelRecord = await this.fuelRecordsRepository.findById(input.id);
    if (!fuelRecord) {
      throw new NotFoundException('Registro de abastecimento não encontrado.');
    }

    if (fuelRecord.getOwnerId() !== input.ownerId) {
      throw new ForbiddenException('Acesso negado a este registro de abastecimento.');
    }

    if (input.driverId && fuelRecord.getDriverId() !== input.driverId) {
      throw new ForbiddenException('Você não tem permissão para alterar o abastecimento de outro motorista.');
    }

    fuelRecord.update({
      fuelType: input.fuelType,
      liters: input.liters,
      pricePerUnit: input.pricePerUnit,
      totalCost: input.totalCost,
      gasStation: input.gasStation,
      fullTank: input.fullTank,
      receiptUrl: input.receiptUrl,
      fueledAt: input.fueledAt,
      notes: input.notes,
    });

    await this.fuelRecordsRepository.save(fuelRecord);

    return fuelRecord;
  }
}
