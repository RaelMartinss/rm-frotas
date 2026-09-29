import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import {
  calculateCostPerKm,
  formatTwoDecimals,
} from '../../../domain/policies/cost-per-km.policy';
import { DateRange } from '../../../domain/value-objects/date-range.vo';
import { CostPerKmSortOption } from '../../../presentation/dto/cost-per-km-query.dto';
import {
  CostPerKmReportResponseDto,
  CostPerKmVehicleRowDto,
} from '../../../presentation/dto/cost-per-km-response.dto';
import {
  COST_PER_KM_READ_REPOSITORY,
  type CostPerKmReadRepository,
} from '../../ports/cost-per-km-read-repository.port';

export interface GetCostPerKmInput {
  clientId: string;
  from: string;
  to: string;
  vehicleId?: string;
  page?: number;
  pageSize?: number;
  sort?: CostPerKmSortOption;
  unpaginated?: boolean;
}

@Injectable()
export class GetCostPerKmQuery {
  constructor(
    @Inject(COST_PER_KM_READ_REPOSITORY)
    private readonly readRepo: CostPerKmReadRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: GetCostPerKmInput): Promise<CostPerKmReportResponseDto> {
    const { clientId, from, to, vehicleId, page = 1, pageSize = 20, sort = CostPerKmSortOption.CPK_DESC, unpaginated = false } = input;

    // 1. Validação de vehicleId pertencente ao cliente
    if (vehicleId) {
      const vehicleExists = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId, clientId },
        select: { id: true },
      });

      if (!vehicleExists) {
        throw new NotFoundException('Veículo não encontrado para esta organização.');
      }
    }

    // 2. Cria DateRange atual e anterior
    const dateRange = DateRange.create(from, to);
    const previousRange = dateRange.getPreviousRange();

    // 3. Busca agregados do período atual e anterior em paralelo
    const [currentAggregates, previousAggregates] = await Promise.all([
      this.readRepo.findAggregates({ clientId, range: dateRange, vehicleId }),
      this.readRepo.findAggregates({ clientId, range: previousRange, vehicleId }),
    ]);

    // 4. Executa a política de domínio pura
    const calculation = calculateCostPerKm(currentAggregates, previousAggregates, dateRange.days, previousRange.days);

    // 5. Ordenação (INSUFFICIENT_DATA sempre por último)
    const sortedVehicles = [...calculation.vehicles].sort((a, b) => {
      const aIsInsufficient = a.status === 'INSUFFICIENT_DATA';
      const bIsInsufficient = b.status === 'INSUFFICIENT_DATA';

      if (aIsInsufficient && !bIsInsufficient) return 1;
      if (!aIsInsufficient && bIsInsufficient) return -1;

      switch (sort) {
        case CostPerKmSortOption.PLATE:
          return a.plate.localeCompare(b.plate);
        case CostPerKmSortOption.CPK_ASC:
          return (a.cpk ?? 0) - (b.cpk ?? 0);
        case CostPerKmSortOption.CPK_DESC:
        default:
          return (b.cpk ?? 0) - (a.cpk ?? 0);
      }
    });

    // 6. Paginação (em memória, após cálculo de frota e ordenação)
    const totalItems = sortedVehicles.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedItems = unpaginated
      ? sortedVehicles
      : sortedVehicles.slice((page - 1) * pageSize, page * pageSize);

    // 7. Mapeamento para DTO de apresentação
    const rows: CostPerKmVehicleRowDto[] = paginatedItems.map((item) => ({
      vehicleId: item.vehicleId,
      plate: item.plate,
      model: item.model,
      year: item.year,
      fuelCost: formatTwoDecimals(item.fuelCost),
      maintenanceCost: formatTwoDecimals(item.maintenanceCost),
      totalCost: formatTwoDecimals(item.totalCost),
      km: item.km,
      cpk: item.cpk !== null ? formatTwoDecimals(item.cpk) : null,
      status: item.status,
      insufficientReason: item.insufficientReason,
      deltaVsFleetPercent: item.deltaVsFleetPercent,
      deltaVsPreviousPercent: item.deltaVsPreviousPercent,
    }));

    return {
      period: {
        from: dateRange.from,
        to: dateRange.to,
        previousFrom: previousRange.from,
        previousTo: previousRange.to,
      },
      summary: {
        totalFuelCost: formatTwoDecimals(calculation.summary.totalFuelCost),
        totalMaintenanceCost: formatTwoDecimals(calculation.summary.totalMaintenanceCost),
        totalCost: formatTwoDecimals(calculation.summary.totalCost),
        eligibleKm: calculation.summary.eligibleKm,
        fleetCpk: calculation.summary.fleetCpk !== null ? formatTwoDecimals(calculation.summary.fleetCpk) : null,
        fleetComparisonAvailable: calculation.summary.fleetComparisonAvailable,
        eligibleVehicles: calculation.summary.eligibleVehicles,
        aboveAverageCount: calculation.summary.aboveAverageCount,
        insufficientDataCount: calculation.summary.insufficientDataCount,
        eligible: {
          vehicles: calculation.summary.eligible.vehicles,
          fuelCost: formatTwoDecimals(calculation.summary.eligible.fuelCost),
          maintenanceCost: formatTwoDecimals(calculation.summary.eligible.maintenanceCost),
          totalCost: formatTwoDecimals(calculation.summary.eligible.totalCost),
          km: calculation.summary.eligible.km,
          cpk: calculation.summary.eligible.cpk !== null ? formatTwoDecimals(calculation.summary.eligible.cpk) : null,
        },
        insufficient: {
          vehicles: calculation.summary.insufficient.vehicles,
          fuelCost: formatTwoDecimals(calculation.summary.insufficient.fuelCost),
          maintenanceCost: formatTwoDecimals(calculation.summary.insufficient.maintenanceCost),
          totalCost: formatTwoDecimals(calculation.summary.insufficient.totalCost),
        },
      },
      rows,
      pagination: {
        page: unpaginated ? 1 : page,
        pageSize: unpaginated ? totalItems : pageSize,
        totalItems,
        totalPages: unpaginated ? 1 : totalPages,
      },
    };
  }
}
