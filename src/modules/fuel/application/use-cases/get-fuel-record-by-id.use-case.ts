import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  IFuelRecordsRepository,
  FuelRecordWithRelations,
} from '../../domain/repositories/fuel-records.repository';

export interface GetFuelRecordByIdInput {
  id: string;
  ownerId: string;
  driverId?: string; // Se for motorista, restringe acesso apenas aos seus registros
}

@Injectable()
export class GetFuelRecordByIdUseCase {
  constructor(private readonly fuelRecordsRepository: IFuelRecordsRepository) {}

  async execute(input: GetFuelRecordByIdInput): Promise<FuelRecordWithRelations> {
    const result = await this.fuelRecordsRepository.findByIdWithRelations(input.id);
    if (!result) {
      throw new NotFoundException('Registro de abastecimento não encontrado.');
    }

    if (result.fuelRecord.getOwnerId() !== input.ownerId) {
      throw new ForbiddenException('Acesso negado a este registro de abastecimento.');
    }

    if (input.driverId && result.fuelRecord.getDriverId() !== input.driverId) {
      throw new ForbiddenException('Você não tem permissão para visualizar o abastecimento de outro motorista.');
    }

    return result;
  }
}
