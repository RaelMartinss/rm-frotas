import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Resumo da dashboard retornado com sucesso.' })
  async getSummary(
    @CurrentUser('userId') userId: string,
  ): Promise<DashboardSummaryResponseDto> {
    return this.getDashboardSummaryUseCase.execute(userId);
  }
}
