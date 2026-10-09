import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  DashboardSummaryResponseDto,
  KpiSummaryDto,
  UpcomingExpirationDto,
  OngoingTripDto,
  RecentAlertDto,
  WeeklyActivityDayDto,
  WeeklyActivitySummaryDto,
} from '../dtos/dashboard-summary.dto';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId?: string,
    clientId?: string | null,
    period: 'SEMANA' | 'MES' | '6_MESES' = 'SEMANA',
  ): Promise<DashboardSummaryResponseDto> {
    const tenantFilter = clientId
      ? { clientId }
      : userId
      ? { ownerId: userId }
      : {};

    const tripTenantFilter = clientId
      ? { clientId }
      : userId
      ? {
          OR: [
            { vehicle: { ownerId: userId } },
            { driver: { ownerId: userId } },
          ],
        }
      : {};

    // 1. Veículos e KPIs
    const vehicles = await this.prisma.vehicle.findMany({
      where: tenantFilter,
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
      where: tenantFilter,
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
        ...tripTenantFilter,
      },
      include: {
        driver: true,
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const ongoingTrips: OngoingTripDto[] = trips.map((t) => {
      const driverName = t.driver?.name || 'Motorista';
      const initials = driverName
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
        driverName,
        driverInitials: initials || 'MO',
        vehicleName: `${t.vehicle?.brand ? t.vehicle.brand + ' ' : ''}${t.vehicle?.model || 'Veículo'}`,
        vehiclePlate: t.vehicle?.plate || '---',
        route: `${t.originCity || ''} (${t.originState || ''}) → ${t.destinationCity || ''} (${t.destinationState || ''})`,
        startTime,
        status: t.status === 'IN_PROGRESS' ? 'EM_ANDAMENTO' : 'PROGRAMADA',
        driverPhotoUrl: t.driver?.photoUrl ?? null,
      };
    });

    // 4. Atividade Operacional de Viagens (por Período: SEMANA, MES, 6_MESES)
    let activityDaysMeta: { label: string; formattedDate: string; start: Date; end: Date }[] = [];

    if (period === 'MES') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

      const weekRanges = [
        { label: 'Sem 1', startDay: 1, endDay: 7 },
        { label: 'Sem 2', startDay: 8, endDay: 14 },
        { label: 'Sem 3', startDay: 15, endDay: 21 },
        { label: 'Sem 4', startDay: 22, endDay: lastDayOfMonth },
      ];

      activityDaysMeta = weekRanges.map(({ label, startDay, endDay }) => {
        const dStart = new Date(year, month, startDay, 0, 0, 0, 0);
        const dEnd = new Date(year, month, endDay, 23, 59, 59, 999);
        const formattedDate = `${String(startDay).padStart(2, '0')} a ${String(endDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
        return { label, formattedDate, start: dStart, end: dEnd };
      });
    } else if (period === '6_MESES') {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 5; i >= 0; i--) {
        const dMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = dMonth.getFullYear();
        const m = dMonth.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();

        const dStart = new Date(y, m, 1, 0, 0, 0, 0);
        const dEnd = new Date(y, m, lastDay, 23, 59, 59, 999);
        const formattedDate = `${monthNames[m]}/${String(y).slice(-2)}`;
        activityDaysMeta.push({ label: monthNames[m], formattedDate, start: dStart, end: dEnd });
      }
    } else {
      // Padrão: SEMANA (Segunda a Domingo)
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      activityDaysMeta = [
        { label: 'Seg', offset: 0 },
        { label: 'Ter', offset: 1 },
        { label: 'Qua', offset: 2 },
        { label: 'Qui', offset: 3 },
        { label: 'Sex', offset: 4 },
        { label: 'Sáb', offset: 5 },
        { label: 'Dom', offset: 6 },
      ].map(({ label, offset }) => {
        const dStart = new Date(monday);
        dStart.setDate(monday.getDate() + offset);
        dStart.setHours(0, 0, 0, 0);

        const dEnd = new Date(dStart);
        dEnd.setHours(23, 59, 59, 999);

        const formattedDate = `${String(dStart.getDate()).padStart(2, '0')}/${String(dStart.getMonth() + 1).padStart(2, '0')}`;

        return {
          label,
          formattedDate,
          start: dStart,
          end: dEnd,
        };
      });
    }

    const startOfPeriod = activityDaysMeta[0].start;
    const endOfPeriod = activityDaysMeta[activityDaysMeta.length - 1].end;

    const tripConditions: any[] = [];
    if (clientId) {
      tripConditions.push({ clientId });
    } else if (userId) {
      tripConditions.push({
        OR: [
          { vehicle: { ownerId: userId } },
          { driver: { ownerId: userId } },
        ],
      });
    }

    const periodTrips = await this.prisma.trip.findMany({
      where: {
        AND: [
          ...tripConditions,
          {
            OR: [
              {
                completedAt: {
                  gte: startOfPeriod,
                  lte: endOfPeriod,
                },
              },
              {
                startedAt: {
                  gte: startOfPeriod,
                  lte: endOfPeriod,
                },
              },
              {
                createdAt: {
                  gte: startOfPeriod,
                  lte: endOfPeriod,
                },
              },
            ],
          },
        ],
      },
    });

    const weeklyDays: WeeklyActivityDayDto[] = activityDaysMeta.map((dayMeta) => {
      const completedCount = periodTrips.filter((t) => {
        if (t.status !== 'COMPLETED') return false;
        const dateToCheck = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);
        return dateToCheck >= dayMeta.start && dateToCheck <= dayMeta.end;
      }).length;

      const ongoingCount = periodTrips.filter((t) => {
        if (t.status !== 'IN_PROGRESS' && t.status !== 'PLANNED') return false;
        const dateToCheck = t.startedAt ? new Date(t.startedAt) : new Date(t.createdAt);
        return dateToCheck >= dayMeta.start && dateToCheck <= dayMeta.end;
      }).length;

      return {
        day: dayMeta.label,
        date: dayMeta.formattedDate,
        completedTrips: completedCount,
        ongoingTrips: ongoingCount,
      };
    });

    const totalCompleted = weeklyDays.reduce((acc, d) => acc + d.completedTrips, 0);
    const totalOngoing = weeklyDays.reduce((acc, d) => acc + d.ongoingTrips, 0);
    const totalWeekly = totalCompleted + totalOngoing;
    const divisor = period === 'MES' ? 4 : period === '6_MESES' ? 6 : 7;
    const dailyAverage = totalWeekly > 0 ? Math.round((totalWeekly / divisor) * 10) / 10 : 0;

    const weeklyActivity: WeeklyActivitySummaryDto = {
      days: weeklyDays,
      dailyAverage,
      totalCompleted,
      totalOngoing,
    };

    // 5. Alertas Recentes
    const alerts: RecentAlertDto[] = [];

    // 5.1 Alertas Críticos de SOS (Incidentes Abertos de Motoristas)
    const openIncidents = await this.prisma.incident.findMany({
      where: {
        status: 'OPEN',
        ...(clientId ? { clientId } : {}),
      },
      include: {
        driver: true,
        vehicle: true,
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const inc of openIncidents) {
      const driverName = inc.driver?.name || 'Motorista';
      const vehicleInfo = inc.vehicle?.plate ? ` (${inc.vehicle.plate})` : '';
      const routeInfo = inc.trip
        ? ` • ${inc.trip.originCity || ''} → ${inc.trip.destinationCity || ''}`
        : '';

      alerts.push({
        id: `alert-sos-${inc.id}`,
        type: 'DANGER',
        title: `🚨 SOS: ${driverName} precisa de ajuda! [${inc.category}]`,
        subtitle: `"${inc.description}"${vehicleInfo}${routeInfo}`,
        timeAgo: 'SOS Urgente',
      });
    }

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
      weeklyActivity,
    };
  }
}

