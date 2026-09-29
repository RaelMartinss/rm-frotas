import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Query,
  StreamableFile,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard';
import { UserRole } from '../../auth/domain/entities/user.entity';
import type { UserPayload } from '../../auth/infrastructure/strategies/jwt.strategy';
import { ExportCostPerKmQuery } from '../application/queries/export-cost-per-km/export-cost-per-km.query';
import { GetCostPerKmQuery } from '../application/queries/get-cost-per-km/get-cost-per-km.query';
import { ReportFormatNotSupportedError } from '../domain/errors/report-format-not-supported.error';
import { ReportPeriodInvalidError } from '../domain/errors/report-period-invalid.error';
import { ReportTooLargeForPdfError } from '../domain/errors/report-too-large-for-pdf.error';
import { CostPerKmQueryDto, ExportCostPerKmQueryDto } from './dto/cost-per-km-query.dto';
import { CostPerKmReportResponseDto } from './dto/cost-per-km-response.dto';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(
    private readonly getCostPerKmQuery: GetCostPerKmQuery,
    private readonly exportCostPerKmQuery: ExportCostPerKmQuery,
  ) {}

  private resolveClientId(user: UserPayload): string {
    const clientId = user.targetClientId || user.clientId;
    if (!clientId) {
      throw new ForbiddenException('Usuário não vinculado a uma organização cliente.');
    }
    return clientId;
  }

  @Get('cost-per-km')
  @ApiOperation({ summary: 'Relatório consolidado de Custo por KM (CPK) da frota e veículos' })
  @ApiResponse({ status: 200, type: CostPerKmReportResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros ou período inválidos (REPORT_PERIOD_INVALID)' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Acesso negado para o perfil atual' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  async getCostPerKm(
    @CurrentUser() user: UserPayload,
    @Query() query: CostPerKmQueryDto,
  ): Promise<CostPerKmReportResponseDto> {
    const clientId = this.resolveClientId(user);

    try {
      return await this.getCostPerKmQuery.execute({
        clientId,
        from: query.from,
        to: query.to,
        vehicleId: query.vehicleId,
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
      });
    } catch (error) {
      if (error instanceof ReportPeriodInvalidError) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          error: error.code,
        });
      }
      throw error;
    }
  }

  @Get('cost-per-km/export')
  @ApiOperation({ summary: 'Exportação do Relatório de Custo por KM em arquivo (CSV ou PDF)' })
  @ApiResponse({ status: 200, description: 'Arquivo baixado via StreamableFile' })
  @ApiResponse({ status: 400, description: 'Formato ou período inválidos' })
  @ApiResponse({ status: 422, description: 'Relatório excede o limite máximo de linhas para exportação em PDF' })
  async exportCostPerKm(
    @CurrentUser() user: UserPayload,
    @Query() query: ExportCostPerKmQueryDto,
  ): Promise<StreamableFile> {
    const clientId = this.resolveClientId(user);

    try {
      const result = await this.exportCostPerKmQuery.execute({
        user,
        clientId,
        from: query.from,
        to: query.to,
        vehicleId: query.vehicleId,
        sort: query.sort,
        format: query.format,
      });

      return new StreamableFile(result.stream, {
        type: result.contentType,
        disposition: `attachment; filename="${result.filename}"`,
      });
    } catch (error) {
      if (
        error instanceof ReportPeriodInvalidError ||
        error instanceof ReportFormatNotSupportedError
      ) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          error: error.code,
        });
      }
      if (error instanceof ReportTooLargeForPdfError) {
        throw new UnprocessableEntityException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: error.message,
          error: error.code,
        });
      }
      throw error;
    }
  }
}
