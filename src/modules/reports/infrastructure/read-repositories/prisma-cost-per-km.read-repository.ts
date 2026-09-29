import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { CostPerKmReadRepository, VehicleCostAggregate } from '../../application/ports/cost-per-km-read-repository.port';
import { DateRange } from '../../domain/value-objects/date-range.vo';

interface RawOdometerKm {
  vehicle_id: string;
  km: number;
}

interface RawOdometerCount {
  vehicle_id: string;
  count: number;
}

@Injectable()
export class PrismaCostPerKmReadRepository implements CostPerKmReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAggregates(params: {
    clientId: string;
    range: DateRange;
    vehicleId?: string;
  }): Promise<VehicleCostAggregate[]> {
    const { clientId, range, vehicleId } = params;

    // 1. Busca todos os veículos do cliente (respeitando vehicleId se informado)
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        clientId,
        ...(vehicleId ? { id: vehicleId } : {}),
      },
      select: {
        id: true,
        plate: true,
        model: true,
        year: true,
      },
      orderBy: { plate: 'asc' },
    });

    if (vehicles.length === 0) {
      return [];
    }

    // 2. Agregação de Combustível (Soma totalCost por veículo no período)
    const fuelGroup = await this.prisma.fuelRecord.groupBy({
      by: ['vehicleId'],
      where: {
        clientId,
        fueledAt: {
          gte: range.start,
          lte: range.end,
        },
        ...(vehicleId ? { vehicleId } : {}),
      },
      _sum: {
        totalCost: true,
      },
    });

    const fuelCostMap = new Map<string, number>();
    for (const fg of fuelGroup) {
      fuelCostMap.set(fg.vehicleId, fg._sum.totalCost || 0);
    }

    // 3. Agregação de Manutenção (Soma cost de manutenções CONCLUIDAS por veículo no período)
    const maintenanceGroup = await this.prisma.maintenance.groupBy({
      by: ['vehicleId'],
      where: {
        clientId,
        status: 'CONCLUIDA',
        finishedAt: {
          gte: range.start,
          lte: range.end,
        },
        ...(vehicleId ? { vehicleId } : {}),
      },
      _sum: {
        cost: true,
      },
    });

    const maintenanceCostMap = new Map<string, number>();
    for (const mg of maintenanceGroup) {
      maintenanceCostMap.set(mg.vehicleId, mg._sum.cost || 0);
    }

    // 4. Leituras de Odômetro via $queryRaw parametrizado com DISTINCT ON
    // 4.1. kmEnd: Última leitura com data <= fim do período
    const kmEndSql = Prisma.sql`
      SELECT DISTINCT ON (vehicle_id)
        vehicle_id,
        current_km AS km
      FROM odometer_readings
      WHERE client_id = ${clientId}
        AND recorded_at <= ${range.end}
        ${vehicleId ? Prisma.sql`AND vehicle_id = ${vehicleId}` : Prisma.empty}
      ORDER BY vehicle_id, recorded_at DESC
    `;

    // 4.2. kmBefore: Última leitura com data < início do período
    const kmBeforeSql = Prisma.sql`
      SELECT DISTINCT ON (vehicle_id)
        vehicle_id,
        current_km AS km
      FROM odometer_readings
      WHERE client_id = ${clientId}
        AND recorded_at < ${range.start}
        ${vehicleId ? Prisma.sql`AND vehicle_id = ${vehicleId}` : Prisma.empty}
      ORDER BY vehicle_id, recorded_at DESC
    `;

    // 4.3. kmFirstInPeriod: Primeira leitura dentro do período (caso não haja leitura anterior)
    const kmFirstInPeriodSql = Prisma.sql`
      SELECT DISTINCT ON (vehicle_id)
        vehicle_id,
        current_km AS km
      FROM odometer_readings
      WHERE client_id = ${clientId}
        AND recorded_at >= ${range.start}
        AND recorded_at <= ${range.end}
        ${vehicleId ? Prisma.sql`AND vehicle_id = ${vehicleId}` : Prisma.empty}
      ORDER BY vehicle_id, recorded_at ASC
    `;

    // 4.4. Contagem de leituras válidas até o fim do período
    const readingsCountSql = Prisma.sql`
      SELECT
        vehicle_id,
        count(*)::int AS count
      FROM odometer_readings
      WHERE client_id = ${clientId}
        AND recorded_at <= ${range.end}
        ${vehicleId ? Prisma.sql`AND vehicle_id = ${vehicleId}` : Prisma.empty}
      GROUP BY vehicle_id
    `;

    const [kmEndRows, kmBeforeRows, kmFirstInPeriodRows, countRows] = await Promise.all([
      this.prisma.$queryRaw<RawOdometerKm[]>(kmEndSql),
      this.prisma.$queryRaw<RawOdometerKm[]>(kmBeforeSql),
      this.prisma.$queryRaw<RawOdometerKm[]>(kmFirstInPeriodSql),
      this.prisma.$queryRaw<RawOdometerCount[]>(readingsCountSql),
    ]);

    const kmEndMap = new Map<string, number>();
    for (const r of kmEndRows) kmEndMap.set(r.vehicle_id, r.km);

    const kmBeforeMap = new Map<string, number>();
    for (const r of kmBeforeRows) kmBeforeMap.set(r.vehicle_id, r.km);

    const kmFirstMap = new Map<string, number>();
    for (const r of kmFirstInPeriodRows) kmFirstMap.set(r.vehicle_id, r.km);

    const countMap = new Map<string, number>();
    for (const r of countRows) countMap.set(r.vehicle_id, r.count);

    // 5. União em memória sem N+1
    return vehicles.map((v) => {
      const fuelCost = fuelCostMap.get(v.id) || 0;
      const maintenanceCost = maintenanceCostMap.get(v.id) || 0;

      const kmEnd = kmEndMap.get(v.id) ?? null;
      let kmStart: number | null = null;
      if (kmBeforeMap.has(v.id)) {
        kmStart = kmBeforeMap.get(v.id)!;
      } else if (kmFirstMap.has(v.id)) {
        kmStart = kmFirstMap.get(v.id)!;
      }

      const validReadingsCount = countMap.get(v.id) || 0;

      return {
        vehicleId: v.id,
        plate: v.plate,
        model: v.model,
        year: v.year,
        fuelCost,
        maintenanceCost,
        kmStart,
        kmEnd,
        validReadingsCount,
      };
    });
  }
}
