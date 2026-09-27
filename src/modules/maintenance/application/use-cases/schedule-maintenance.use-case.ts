import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { IMaintenancesRepository } from '../../domain/repositories/maintenances.repository';
import { IVehiclesRepository } from '../../../vehicles/domain/repositories/vehicles.repository';
import type { ITripsRepository } from '../../../trips/application/repositories/trips-repository.interface';
import { TripStatus } from '../../../trips/domain/entities/trip-status.enum';
import { Maintenance } from '../../domain/entities/maintenance.entity';
import { MaintenanceType } from '../../domain/enums/maintenance-type.enum';
import { MaintenanceStatus } from '../../domain/enums/maintenance-status.enum';
import { MaintenanceItem } from '../../domain/value-objects/maintenance-item.vo';

export interface ScheduleMaintenanceInput {
  ownerId: string;
  clientId?: string;
  vehicleId: string;
  type?: MaintenanceType;
  description: string;
  serviceProvider?: string | null;
  scheduledDate?: Date | null;
  items?: { name: string; cost: number; quantity?: number }[];
}

@Injectable()
export class ScheduleMaintenanceUseCase {
  constructor(
    private readonly maintenanceRepository: IMaintenancesRepository,
    private readonly vehiclesRepository: IVehiclesRepository,
    @Optional()
    @Inject('ITripsRepository')
    private readonly tripsRepository?: ITripsRepository,
  ) {}

  async execute(input: ScheduleMaintenanceInput): Promise<Maintenance> {
    const vehicle = await this.vehiclesRepository.findById(input.vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    if (vehicle.getOwnerId() && vehicle.getOwnerId() !== input.ownerId) {
      throw new UnauthorizedException('Você não tem permissão para gerenciar este veículo.');
    }

    if (this.tripsRepository) {
      const activeTrip = await this.tripsRepository.findActiveByVehicleId(input.vehicleId);
      if (activeTrip && activeTrip.getStatus() === TripStatus.IN_PROGRESS) {
        const arrival = activeTrip.getEstimatedArrivalDate() || activeTrip.getScheduledDate();
        if (!input.scheduledDate) {
          throw new BadRequestException(
            'O veículo está atualmente em viagem. Informe uma data de agendamento posterior à previsão de chegada.'
          );
        }

        const scheduledTime = new Date(input.scheduledDate).getTime();
        if (arrival && scheduledTime <= new Date(arrival).getTime()) {
          const arrivalFormatted = new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(arrival));
          throw new BadRequestException(
            `O veículo está em viagem com previsão de chegada em ${arrivalFormatted}. O agendamento da manutenção só pode ser realizado para data/hora posterior à chegada.`
          );
        }
      }
    }

    const items = input.items?.map(
      (item) =>
        new MaintenanceItem({
          name: item.name,
          cost: item.cost,
          quantity: item.quantity,
        })
    );

    const maintenance = new Maintenance({
      vehicleId: input.vehicleId,
      clientId: input.clientId ?? vehicle.getClientId(),
      ownerId: input.ownerId,
      type: input.type ?? MaintenanceType.PREVENTIVA,
      status: MaintenanceStatus.AGENDADA,
      description: input.description,
      serviceProvider: input.serviceProvider,
      scheduledDate: input.scheduledDate,
      items,
    });

    await this.maintenanceRepository.save(maintenance);
    return maintenance;
  }
}
