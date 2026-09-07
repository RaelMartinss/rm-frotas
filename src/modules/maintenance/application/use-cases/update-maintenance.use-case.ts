import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IMaintenancesRepository } from '../../domain/repositories/maintenances.repository';
import { Maintenance } from '../../domain/entities/maintenance.entity';
import { MaintenanceType } from '../../domain/enums/maintenance-type.enum';
import { MaintenanceItem } from '../../domain/value-objects/maintenance-item.vo';

export interface UpdateMaintenanceInput {
  ownerId: string;
  maintenanceId: string;
  description?: string;
  serviceProvider?: string | null;
  scheduledDate?: Date | null;
  items?: { name: string; cost: number; quantity?: number }[];
  type?: MaintenanceType;
  cost?: number;
}

@Injectable()
export class UpdateMaintenanceUseCase {
  constructor(private readonly maintenanceRepository: IMaintenancesRepository) {}

  async execute(input: UpdateMaintenanceInput): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepository.findById(input.maintenanceId);
    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada.');
    }

    if (maintenance.getOwnerId() !== input.ownerId) {
      throw new UnauthorizedException('Você não tem permissão para gerenciar esta manutenção.');
    }

    const items = input.items?.map(
      (item) =>
        new MaintenanceItem({
          name: item.name,
          cost: item.cost,
          quantity: item.quantity,
        })
    );

    maintenance.updateDetails({
      description: input.description,
      serviceProvider: input.serviceProvider,
      scheduledDate: input.scheduledDate,
      type: input.type,
      items,
      cost: input.cost,
    });

    await this.maintenanceRepository.save(maintenance);
    return maintenance;
  }
}
