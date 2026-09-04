export interface KpiSummaryDto {
  activeVehicles: number;
  availableVehicles: number;
  availablePercentage: number;
  inMaintenanceVehicles: number;
  inMaintenancePercentage: number;
  unavailableVehicles: number;
  unavailablePercentage: number;
}

export interface UpcomingExpirationDto {
  id: string;
  type: 'CNH' | 'CRLV' | 'SEGURO';
  title: string;
  subtitle: string;
  daysRemaining: number;
  expirationDate: string;
}

export interface OngoingTripDto {
  id: string;
  driverName: string;
  driverInitials: string;
  vehicleName: string;
  vehiclePlate: string;
  route: string;
  startTime: string;
  status: 'EM_ANDAMENTO' | 'PROGRAMADA';
}

export interface RecentAlertDto {
  id: string;
  type: 'WARNING' | 'DANGER' | 'INFO';
  title: string;
  subtitle: string;
  timeAgo: string;
}

export interface DashboardSummaryResponseDto {
  kpis: KpiSummaryDto;
  expirations: UpcomingExpirationDto[];
  trips: OngoingTripDto[];
  alerts: RecentAlertDto[];
}
