import { describe, expect, it, beforeEach } from 'vitest';
import { DateRange } from '../../../../domain/value-objects/date-range.vo';
import {
  CostPerKmReadRepository,
  VehicleCostAggregate,
} from '../../../ports/cost-per-km-read-repository.port';
import { GetCostPerKmQuery } from '../get-cost-per-km.query';
import { CostPerKmSortOption } from '../../../../presentation/dto/cost-per-km-query.dto';

class InMemoryCostPerKmReadRepository implements CostPerKmReadRepository {
  public data: VehicleCostAggregate[] = [];

  async findAggregates(params: {
    clientId: string;
    range: DateRange;
    vehicleId?: string;
  }): Promise<VehicleCostAggregate[]> {
    if (params.vehicleId) {
      return this.data.filter((d) => d.vehicleId === params.vehicleId);
    }
    return this.data;
  }
}

describe('GetCostPerKmQuery (Use Case)', () => {
  let readRepo: InMemoryCostPerKmReadRepository;
  let mockPrisma: any;
  let query: GetCostPerKmQuery;

  beforeEach(() => {
    readRepo = new InMemoryCostPerKmReadRepository();
    mockPrisma = {
      vehicle: {
        findFirst: async ({ where }: any) => {
          if (where.id === 'non-existent') return null;
          return { id: where.id };
        },
      },
    };
    query = new GetCostPerKmQuery(readRepo, mockPrisma);
  });

  it('deve ordenar colocando INSUFFICIENT_DATA sempre por último e paginar os resultados', async () => {
    readRepo.data = [
      {
        vehicleId: 'v-insufficient',
        plate: 'AAA0001',
        model: 'M1',
        year: 2020,
        fuelCost: 100,
        maintenanceCost: 0,
        kmStart: null,
        kmEnd: null,
        validReadingsCount: 0,
      },
      {
        vehicleId: 'v-low-cpk',
        plate: 'BBB0002',
        model: 'M2',
        year: 2020,
        fuelCost: 1000,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1000, // CPK 1.00
        validReadingsCount: 2,
      },
      {
        vehicleId: 'v-high-cpk',
        plate: 'CCC0003',
        model: 'M3',
        year: 2020,
        fuelCost: 3000,
        maintenanceCost: 0,
        kmStart: 0,
        kmEnd: 1000, // CPK 3.00
        validReadingsCount: 2,
      },
    ];

    const result = await query.execute({
      clientId: 'client-1',
      from: '2026-09-01',
      to: '2026-09-28',
      sort: CostPerKmSortOption.CPK_DESC,
      page: 1,
      pageSize: 2, // paginação de 2 itens
    });

    // Summary deve cobrir todos os 3 veículos, não só os 2 da página
    expect(result.summary.totalCost).toBe('4100.00');
    expect(result.summary.eligibleKm).toBe(2000);
    expect(result.pagination.totalItems).toBe(3);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.rows).toHaveLength(2);

    // Invariante: eligible.totalCost + insufficient.totalCost = totalCost
    const eligibleTotal = parseFloat(result.summary.eligible.totalCost);
    const insufficientTotal = parseFloat(result.summary.insufficient.totalCost);
    const grandTotal = parseFloat(result.summary.totalCost);
    expect(eligibleTotal + insufficientTotal).toBeCloseTo(grandTotal, 2);

    // Eligible vehicles = 2 (v-low-cpk e v-high-cpk)
    expect(result.summary.eligible.vehicles).toBe(2);
    expect(result.summary.insufficient.vehicles).toBe(1);

    // O primeiro deve ser v-high-cpk (3.00), o segundo v-low-cpk (1.00)
    expect(result.rows[0].vehicleId).toBe('v-high-cpk');
    expect(result.rows[1].vehicleId).toBe('v-low-cpk');

    // Página 2 deve ter o INSUFFICIENT_DATA
    const page2 = await query.execute({
      clientId: 'client-1',
      from: '2026-09-01',
      to: '2026-09-28',
      sort: CostPerKmSortOption.CPK_DESC,
      page: 2,
      pageSize: 2,
    });
    expect(page2.rows).toHaveLength(1);
    expect(page2.rows[0].vehicleId).toBe('v-insufficient');
  });

  it('deve lançar NotFoundException quando vehicleId não pertencer ao cliente', async () => {
    await expect(
      query.execute({
        clientId: 'client-1',
        from: '2026-09-01',
        to: '2026-09-28',
        vehicleId: 'non-existent',
      }),
    ).rejects.toThrow('Veículo não encontrado para esta organização.');
  });
});
