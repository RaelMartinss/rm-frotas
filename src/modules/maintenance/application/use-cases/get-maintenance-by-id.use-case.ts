import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IMaintenancesRepository, MaintenanceWithVehicleDetails } from '../../domain/repositories/maintenances.repository';

export interface GetMaintenanceByIdInput {
  ownerId: string;
  maintenanceId: string;
}

@Injectable()
export class GetMaintenanceByIdUseCase {
  constructor(private readonly maintenanceRepository: IMaintenancesRepository) {}

  async execute(input: GetMaintenanceByIdInput): Promise<MaintenanceWithVehicleDetails> {
    const result = await this.maintenanceRepository.findByIdWithVehicle(input.maintenanceId);
    if (!result) {
      throw new NotFoundException('Manutenção não encontrada.');
    }

    if (result.maintenance.getOwnerId() !== input.ownerId) {
      throw new UnauthorizedException('Você não tem permissão para visualizar esta manutenção.');
    }

    return result;
  }
}
