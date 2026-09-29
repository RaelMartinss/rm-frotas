import { ApiProperty } from '@nestjs/swagger';
import type { InsufficientReason, VehicleCpkStatus } from '../../domain/policies/cost-per-km.policy';

export class CostPerKmPeriodDto {
  @ApiProperty({ example: '2026-09-01' })
  from!: string;

  @ApiProperty({ example: '2026-09-28' })
  to!: string;

  @ApiProperty({ example: '2026-08-04' })
  previousFrom!: string;

  @ApiProperty({ example: '2026-08-31' })
  previousTo!: string;
}

export class FleetCpkSubtotalDto {
  @ApiProperty({ example: 6 })
  vehicles!: number;

  @ApiProperty({ example: '12450.80' })
  fuelCost!: string;

  @ApiProperty({ example: '8300.00' })
  maintenanceCost!: string;

  @ApiProperty({ example: '20750.80' })
  totalCost!: string;

  @ApiProperty({ example: 5390 })
  km!: number;

  @ApiProperty({ example: '3.85', nullable: true })
  cpk!: string | null;
}

export class FleetCpkInsufficientSubtotalDto {
  @ApiProperty({ example: 2 })
  vehicles!: number;

  @ApiProperty({ example: '1500.00' })
  fuelCost!: string;

  @ApiProperty({ example: '300.00' })
  maintenanceCost!: string;

  @ApiProperty({ example: '1800.00' })
  totalCost!: string;
}

export class CostPerKmSummaryDto {
  @ApiProperty({ example: '13950.80' })
  totalFuelCost!: string;

  @ApiProperty({ example: '8600.00' })
  totalMaintenanceCost!: string;

  @ApiProperty({ example: '22550.80' })
  totalCost!: string;

  @ApiProperty({ example: 5390 })
  eligibleKm!: number;

  @ApiProperty({ example: '3.85', nullable: true })
  fleetCpk!: string | null;

  @ApiProperty({ example: true })
  fleetComparisonAvailable!: boolean;

  @ApiProperty({ example: 6 })
  eligibleVehicles!: number;

  @ApiProperty({ example: 1 })
  aboveAverageCount!: number;

  @ApiProperty({ example: 2 })
  insufficientDataCount!: number;

  @ApiProperty({ type: FleetCpkSubtotalDto })
  eligible!: FleetCpkSubtotalDto;

  @ApiProperty({ type: FleetCpkInsufficientSubtotalDto })
  insufficient!: FleetCpkInsufficientSubtotalDto;
}

export class CostPerKmVehicleRowDto {
  @ApiProperty({ example: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ example: 'ABC1D23' })
  plate!: string;

  @ApiProperty({ example: 'Hilux' })
  model!: string;

  @ApiProperty({ example: 2021 })
  year!: number;

  @ApiProperty({ example: '2100.00' })
  fuelCost!: string;

  @ApiProperty({ example: '1800.00' })
  maintenanceCost!: string;

  @ApiProperty({ example: '3900.00' })
  totalCost!: string;

  @ApiProperty({ example: 780 })
  km!: number;

  @ApiProperty({ example: '5.00', nullable: true })
  cpk!: string | null;

  @ApiProperty({ example: 'ABOVE_AVERAGE', enum: ['OK', 'ABOVE_AVERAGE', 'INSUFFICIENT_DATA'] })
  status!: VehicleCpkStatus;

  @ApiProperty({ example: null, nullable: true, enum: ['NO_READINGS', 'KM_REGRESSION', 'LOW_KM', 'KM_OUTLIER'] })
  insufficientReason!: InsufficientReason | null;

  @ApiProperty({ example: 29.9, nullable: true })
  deltaVsFleetPercent!: number | null;

  @ApiProperty({ example: 12.4, nullable: true })
  deltaVsPreviousPercent!: number | null;
}

export class CostPerKmPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 8 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class CostPerKmReportResponseDto {
  @ApiProperty()
  period!: CostPerKmPeriodDto;

  @ApiProperty()
  summary!: CostPerKmSummaryDto;

  @ApiProperty({ type: [CostPerKmVehicleRowDto] })
  rows!: CostPerKmVehicleRowDto[];

  @ApiProperty()
  pagination!: CostPerKmPaginationDto;
}
