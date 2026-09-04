import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  DashboardSummaryResponseDto,
  KpiSummaryDto,
  UpcomingExpirationDto,
  OngoingTripDto,
  RecentAlertDto,
} from '../dtos/dashboard-summary.dto';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId?: string): Promise<DashboardSummaryResponseDto> {
    const defaultOwnerId = process.env.DEFAULT_OWNER_ID;
    const ownerConditions = [
      ...(userId ? [{ ownerId: userId }] : []),
      ...(defaultOwnerId ? [{ ownerId: defaultOwnerId }] : []),
    ];


    const ownerFilter = ownerConditions.length > 0 ? { OR: ownerConditions } : {};

    // 1. Veículos e KPIs
    const vehicles = await this.prisma.vehicle.findMany({
      where: ownerFilter,
    });


    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const inMaintenanceVehicles = vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length;
    const unavailableVehicles = vehicles.filter((v) => v.status === 'IN_USE').length;

    const availablePercentage = totalVehicles > 0 ? Math.round((availableVehicles / totalVehicles) * 100) : 0;
    const inMaintenancePercentage = totalVehicles > 0 ? Math.round((inMaintenanceVehicles / totalVehicles) * 100) : 0;
    const unavailablePercentage = totalVehicles > 0 ? Math.round((unavailableVehicles / totalVehicles) * 100) : 0;

    const kpis: KpiSummaryDto = {
      activeVehicles: totalVehicles,
      availableVehicles,
      availablePercentage,
      inMaintenanceVehicles,
      inMaintenancePercentage,
      unavailableVehicles,
      unavailablePercentage,
    };

    // 2. Expirações Próximas (CRLV de veículos + CNH de motoristas)
    const now = new Date();
    const expirations: UpcomingExpirationDto[] = [];

    // Expirações de CRLV
    for (const v of vehicles) {
      if (v.crlvExpiration) {
        const daysRemaining = Math.ceil(
          (new Date(v.crlvExpiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysRemaining <= 60) {
          expirations.push({
            id: `crlv-${v.id}`,
            type: 'CRLV',
            title: `${v.brand ? v.brand + ' ' : ''}${v.model} (${v.plate})`,
            subtitle: 'Vencimento do documento CRLV',
            daysRemaining,
            expirationDate: new Date(v.crlvExpiration).toLocaleDateString('pt-BR'),
          });
        }
      }
    }

    // Expirações de CNH
    const drivers = await this.prisma.driver.findMany({
      where: ownerFilter,
    });

    for (const d of drivers) {
      if (d.cnhExpirationDate) {
        const daysRemaining = Math.ceil(
          (new Date(d.cnhExpirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysRemaining <= 60) {
          expirations.push({
            id: `cnh-${d.id}`,
            type: 'CNH',
            title: d.name,
            subtitle: `CNH Categoria ${d.cnhCategory}`,
            daysRemaining,
            expirationDate: new Date(d.cnhExpirationDate).toLocaleDateString('pt-BR'),
          });
        }
      }
    }

    // Ordena as expirações mais urgentes primeiro
    expirations.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // 3. Viagens em andamento ou planejadas
    const trips = await this.prisma.trip.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'PLANNED'] },
        ...(userId ? { vehicle: { ownerId: userId } } : {}),
      },
      include: {
        driver: true,
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const ongoingTrips: OngoingTripDto[] = trips.map((t) => {
      const initials = t.driver.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const startTime = t.startedAt
        ? new Date(t.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : new Date(t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        id: t.id,
        driverName: t.driver.name,
        driverInitials: initials || 'MO',
        vehicleName: `${t.vehicle.brand ? t.vehicle.brand + ' ' : ''}${t.vehicle.model}`,
        vehiclePlate: t.vehicle.plate,
        route: `${t.originCity} (${t.originState}) → ${t.destinationCity} (${t.destinationState})`,
        startTime,
        status: t.status === 'IN_PROGRESS' ? 'EM_ANDAMENTO' : 'PROGRAMADA',
      };
    });

    // 4. Alertas Recentes
    const alerts: RecentAlertDto[] = [];

    // Alertas de expiração
    for (const exp of expirations.slice(0, 3)) {
      if (exp.daysRemaining <= 0) {
        alerts.push({
          id: `alert-exp-${exp.id}`,
          type: 'DANGER',
          title: `${exp.type} Vencido(a)`,
          subtitle: `${exp.title} - Data limite: ${exp.expirationDate}`,
          timeAgo: 'Urgente',
        });
      } else if (exp.daysRemaining <= 15) {
        alerts.push({
          id: `alert-exp-${exp.id}`,
          type: 'WARNING',
          title: `${exp.type} Vence em ${exp.daysRemaining} dias`,
          subtitle: `${exp.title} - Renovar até ${exp.expirationDate}`,
          timeAgo: `${exp.daysRemaining}d restantes`,
        });
      }
    }

    // Alertas de manutenção
    const maintenanceVehicles = vehicles.filter((v) => v.status === 'IN_MAINTENANCE');
    for (const v of maintenanceVehicles.slice(0, 2)) {
      alerts.push({
        id: `alert-maint-${v.id}`,
        type: 'WARNING',
        title: 'Veículo em Manutenção',
        subtitle: `${v.brand ? v.brand + ' ' : ''}${v.model} (${v.plate})`,
        timeAgo: 'Em oficina',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'alert-ok',
        type: 'INFO',
        title: 'Operação Estável',
        subtitle: 'Todos os documentos e veículos estão com status regular.',
        timeAgo: 'Hoje',
      });
    }

    return {
      kpis,
      expirations,
      trips: ongoingTrips,
      alerts,
    };
  }
}
