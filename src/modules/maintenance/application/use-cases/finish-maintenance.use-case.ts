import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IMaintenancesRepository } from '../../domain/repositories/maintenances.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { Maintenance } from '../../domain/entities/maintenance.entity';
import { MaintenanceItem } from '../../domain/value-objects/maintenance-item.vo';
import { VehicleStatus } from '../../../vehicles/domain/entities/vehicle.entity';

export interface FinishMaintenanceInput {
  ownerId: string;
  maintenanceId: string;
  odometerAtService: number;
  finishedAt?: Date;
  items?: { name: string; cost: number; quantity?: number }[];
  cost?: number;
}

@Injectable()
export class FinishMaintenanceUseCase {
  constructor(
    private readonly maintenanceRepository: IMaintenancesRepository,
    private readonly vehiclesRepository: IVehiclesRepository
  ) {}

  async execute(input: FinishMaintenanceInput): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepository.findById(input.maintenanceId);
    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada.');
    }

    if (maintenance.getOwnerId() !== input.ownerId) {
      throw new UnauthorizedException('Você não tem permissão para gerenciar esta manutenção.');
    }

    const vehicle = await this.vehiclesRepository.findById(maintenance.getVehicleId());
    if (!vehicle) {
      throw new NotFoundException('Veículo vinculado à manutenção não foi encontrado.');
    }

    const items = input.items?.map(
      (item) =>
        new MaintenanceItem({
          name: item.name,
          cost: item.cost,
          quantity: item.quantity,
        })
    );

    // Finaliza a manutenção no domínio
    maintenance.finish({
      odometerAtService: input.odometerAtService,
      finishedAt: input.finishedAt,
      items,
      cost: input.cost,
      currentVehicleKm: vehicle.getCurrentKm(),
    });

    // Atualiza odômetro do veículo se informado valor superior
    if (input.odometerAtService > vehicle.getCurrentKm()) {
      vehicle.updateKm(input.odometerAtService);
    }

    // Libera o status do veículo para DISPONIVEL (AVAILABLE)
    if (vehicle.getStatus() === VehicleStatus.IN_MAINTENANCE) {
      vehicle.finishMaintenance();
    } else if (vehicle.getStatus() !== VehicleStatus.IN_USE) {
      vehicle.markAsAvailable();
    }

    await this.vehiclesRepository.save(vehicle);
    await this.maintenanceRepository.save(maintenance);

    return maintenance;
  }
}
