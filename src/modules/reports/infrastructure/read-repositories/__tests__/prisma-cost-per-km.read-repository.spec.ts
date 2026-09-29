import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import { PrismaCostPerKmReadRepository } from '../prisma-cost-per-km.read-repository';
import { DateRange } from '../../../domain/value-objects/date-range.vo';

describe('PrismaCostPerKmReadRepository (Integration)', () => {
  let prisma: PrismaService;
  let repo: PrismaCostPerKmReadRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaCostPerKmReadRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve executar findAggregates sem erro de sintaxe SQL ou cast de tipo', async () => {
    const clients = await prisma.client.findMany({ take: 1 });
    if (clients.length === 0) {
      const range = DateRange.create('2026-09-01', '2026-09-28');
      const aggregates = await repo.findAggregates({
        clientId: 'non-existent-client',
        range,
      });
      expect(aggregates).toEqual([]);
      return;
    }

    const clientId = clients[0].id;
    const range = DateRange.create('2026-09-01', '2026-09-28');

    const aggregates = await repo.findAggregates({
      clientId,
      range,
    });

    expect(Array.isArray(aggregates)).toBe(true);
    for (const agg of aggregates) {
      expect(agg.vehicleId).toBeDefined();
      expect(agg.plate).toBeDefined();
      expect(typeof agg.fuelCost).toBe('number');
      expect(typeof agg.maintenanceCost).toBe('number');
      expect(typeof agg.validReadingsCount).toBe('number');
    }
  });
});
