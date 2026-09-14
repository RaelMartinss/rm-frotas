import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('Health')
@Controller({
  path: 'health',
  version: [VERSION_NEUTRAL, '1'],
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memoryIndicator: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary:
      'Verificar status de saúde da API, conectividade com o banco de dados e limites de memória',
  })
  check() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
      () => this.memoryIndicator.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memoryIndicator.checkRSS('memory_rss', 450 * 1024 * 1024),
    ]);
  }
}