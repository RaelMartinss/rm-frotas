import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetDashboardSummaryUseCase } from '../../application/use-cases/get-dashboard-summary.use-case';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { DashboardSummaryResponseDto } from '../../application/dtos/dashboard-summary.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(
    private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Obter resumo de indicadores, expirações, viagens e alertas da dashboard' })
  @ApiQuery({ name: 'period', required: false, enum: ['SEMANA', 'MES', '6_MESES'], description: 'Período para o gráfico de movimentação de viagens' })
  @ApiResponse({ status: 200, description: 'Resumo da dashboard retornado com sucesso.' })
  async getSummary(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query('period') period?: 'SEMANA' | 'MES' | '6_MESES',
  ): Promise<DashboardSummaryResponseDto> {
    return this.getDashboardSummaryUseCase.execute(userId, clientId, period);
  }
}
