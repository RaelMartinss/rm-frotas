import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  FindManyMaintenancesPaginatedOutput,
  IMaintenancesRepository,
} from '../../domain/repositories/maintenances.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { MaintenanceStatus } from '../../domain/enums/maintenance-status.enum';
import { MaintenanceType } from '../../domain/enums/maintenance-type.enum';

export interface ListMaintenancesInput {
  ownerId: string;
  vehicleId?: string;
  status?: MaintenanceStatus;
  type?: MaintenanceType;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListMaintenancesUseCase {
  constructor(
    private readonly maintenanceRepository: IMaintenancesRepository,
    private readonly vehiclesRepository: IVehiclesRepository
  ) {}

  async execute(input: ListMaintenancesInput): Promise<FindManyMaintenancesPaginatedOutput> {
    if (input.vehicleId) {
      const vehicle = await this.vehiclesRepository.findById(input.vehicleId);
      if (!vehicle) {
        throw new NotFoundException('Veículo não encontrado.');
      }
      if (vehicle.getOwnerId() && vehicle.getOwnerId() !== input.ownerId) {
        throw new UnauthorizedException('Você não tem permissão para visualizar manutenções deste veículo.');
      }
    }

    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    return this.maintenanceRepository.findManyPaginated({
      ownerId: input.ownerId,
      vehicleId: input.vehicleId,
      status: input.status,
      type: input.type,
      from: input.from,
      to: input.to,
      page,
      limit,
    });
  }
}
