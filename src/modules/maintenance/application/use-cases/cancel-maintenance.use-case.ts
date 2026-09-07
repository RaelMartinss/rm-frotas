import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IMaintenancesRepository } from '../../domain/repositories/maintenances.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { Maintenance } from '../../domain/entities/maintenance.entity';
import { MaintenanceStatus } from '../../domain/enums/maintenance-status.enum';
import { VehicleStatus } from '../../../vehicles/domain/entities/vehicle.entity';

export interface CancelMaintenanceInput {
  ownerId: string;
  maintenanceId: string;
  reason?: string;
}

@Injectable()
export class CancelMaintenanceUseCase {
  constructor(
    private readonly maintenanceRepository: IMaintenancesRepository,
    private readonly vehiclesRepository: IVehiclesRepository
  ) {}

  async execute(input: CancelMaintenanceInput): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepository.findById(input.maintenanceId);
    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada.');
    }

    if (maintenance.getOwnerId() !== input.ownerId) {
      throw new UnauthorizedException('Você não tem permissão para gerenciar esta manutenção.');
    }

    const wasInProgress = maintenance.getStatus() === MaintenanceStatus.EM_ANDAMENTO;

    maintenance.cancel();

    if (wasInProgress) {
      const vehicle = await this.vehiclesRepository.findById(maintenance.getVehicleId());
      if (vehicle && vehicle.getStatus() === VehicleStatus.IN_MAINTENANCE) {
        vehicle.finishMaintenance();
        await this.vehiclesRepository.save(vehicle);
      }
    }

    await this.maintenanceRepository.save(maintenance);
    return maintenance;
  }
}
