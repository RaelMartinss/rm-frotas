import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaHealthIndicator } from '../prisma.health';
import type { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import type { HealthIndicatorService } from '@nestjs/terminus';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaMock: { $queryRaw: ReturnType<typeof vi.fn> };
  let healthIndicatorServiceMock: { check: ReturnType<typeof vi.fn> };
  let indicatorCheckObj: { up: ReturnType<typeof vi.fn>; down: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prismaMock = {
      $queryRaw: vi.fn(),
    };

    indicatorCheckObj = {
      up: vi.fn().mockReturnValue({ database: { status: 'up' } }),
      down: vi.fn().mockImplementation((data) => ({ database: { status: 'down', ...data } })),
    };

    healthIndicatorServiceMock = {
      check: vi.fn().mockReturnValue(indicatorCheckObj),
    };

    indicator = new PrismaHealthIndicator(
      prismaMock as unknown as PrismaService,
      healthIndicatorServiceMock as unknown as HealthIndicatorService,
    );
  });

  it('deve retornar up() quando a query SELECT 1 executar com sucesso', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const result = await indicator.isHealthy('database');

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(indicatorCheckObj.up).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('deve retornar down() com a mensagem de erro quando a query falhar', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Connection timeout to Postgres'));

    const result = await indicator.isHealthy('database');

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(indicatorCheckObj.down).toHaveBeenCalledWith({
      message: 'Connection timeout to Postgres',
    });
    expect(result).toEqual({
      database: { status: 'down', message: 'Connection timeout to Postgres' },
    });
  });
});
