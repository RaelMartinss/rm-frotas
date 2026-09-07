import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IFuelRecordsRepository } from '../../domain/repositories/fuel-records.repository';

export interface DeleteFuelRecordInput {
  id: string;
  ownerId: string;
}

@Injectable()
export class DeleteFuelRecordUseCase {
  constructor(private readonly fuelRecordsRepository: IFuelRecordsRepository) {}

  async execute(input: DeleteFuelRecordInput): Promise<void> {
    const fuelRecord = await this.fuelRecordsRepository.findById(input.id);
    if (!fuelRecord) {
      throw new NotFoundException('Registro de abastecimento não encontrado.');
    }

    if (fuelRecord.getOwnerId() !== input.ownerId) {
      throw new ForbiddenException('Acesso negado a este registro de abastecimento.');
    }

    await this.fuelRecordsRepository.delete(input.id);
  }
}
