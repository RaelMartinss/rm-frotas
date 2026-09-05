import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
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
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verificar status de saúde da API e conectividade com o banco de dados' })
  check() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
    ]);
  }
}