import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IMaintenancesRepository } from '../../domain/repositories/maintenances.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import { Maintenance } from '../../domain/entities/maintenance.entity';
import { MaintenanceType } from '../../domain/enums/maintenance-type.enum';
import { MaintenanceStatus } from '../../domain/enums/maintenance-status.enum';
import { VehicleStatus } from '../../../vehicles/domain/entities/vehicle.entity';
import { VehicleAlreadyInMaintenanceException } from '../../domain/exceptions/maintenance.exceptions';

export interface StartMaintenanceInput {
  ownerId: string;
  clientId?: string;
  maintenanceId?: string;
  vehicleId?: string;
  type?: MaintenanceType;
  description?: string;
  serviceProvider?: string | null;
  startedAt?: Date;
}

@Injectable()
export class StartMaintenanceUseCase {
  constructor(
    private readonly maintenanceRepository: IMaintenancesRepository,
    private readonly vehiclesRepository: IVehiclesRepository
  ) {}

  async execute(input: StartMaintenanceInput): Promise<Maintenance> {
    let maintenance: Maintenance;
    let targetVehicleId: string;

    if (input.maintenanceId) {
      const found = await this.maintenanceRepository.findById(input.maintenanceId);
      if (!found) {
        throw new NotFoundException('Manutenção não encontrada.');
      }
      if (found.getOwnerId() !== input.ownerId) {
        throw new UnauthorizedException('Você não tem permissão para gerenciar esta manutenção.');
      }
      maintenance = found;
      targetVehicleId = found.getVehicleId();
    } else if (input.vehicleId) {
      targetVehicleId = input.vehicleId;
      if (!input.description) {
        throw new BadRequestException('A descrição da manutenção é obrigatória ao iniciar diretamente.');
      }
      const vehicle = await this.vehiclesRepository.findById(targetVehicleId);
      if (!vehicle) {
        throw new NotFoundException('Veículo não encontrado.');
      }
      maintenance = new Maintenance({
        vehicleId: input.vehicleId,
        clientId: input.clientId ?? vehicle.getClientId(),
        ownerId: input.ownerId,
        type: input.type ?? MaintenanceType.CORRETIVA,
        status: MaintenanceStatus.EM_ANDAMENTO,
        description: input.description,
        serviceProvider: input.serviceProvider,
        startedAt: input.startedAt ?? new Date(),
      });
    } else {
      throw new BadRequestException('Informe o ID da manutenção ou o ID do veículo para iniciar.');
    }

    const vehicle = await this.vehiclesRepository.findById(targetVehicleId);
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    if (vehicle.getOwnerId() && vehicle.getOwnerId() !== input.ownerId) {
      throw new UnauthorizedException('Você não tem permissão para gerenciar este veículo.');
    }

    // Checa se já existe outra manutenção em andamento para o veículo
    const activeMaintenance = await this.maintenanceRepository.findActiveByVehicleId(targetVehicleId);
    if (activeMaintenance && activeMaintenance.getId() !== maintenance.getId()) {
      throw new VehicleAlreadyInMaintenanceException();
    }

    if (vehicle.getStatus() === VehicleStatus.IN_MAINTENANCE && (!input.maintenanceId || maintenance.getStatus() !== MaintenanceStatus.EM_ANDAMENTO)) {
      throw new VehicleAlreadyInMaintenanceException();
    }

    // Transição no domínio
    maintenance.start(input.startedAt);
    if (vehicle.getStatus() !== VehicleStatus.IN_MAINTENANCE) {
      vehicle.sendToMaintenance();
    }

    await this.vehiclesRepository.save(vehicle);
    await this.maintenanceRepository.save(maintenance);

    return maintenance;
  }
}
