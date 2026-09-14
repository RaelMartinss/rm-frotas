import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../../auth/infrastructure/decorators/current-user.decorator';
import { UserRole } from '../../../../auth/domain/entities/user.entity';
import { StartImpersonationUseCase } from '../../../application/use-cases/start-impersonation.use-case';
import { EndImpersonationUseCase } from '../../../application/use-cases/end-impersonation.use-case';
import { GetActiveImpersonationUseCase } from '../../../application/use-cases/get-active-impersonation.use-case';
import { GetImpersonationAuditLogsUseCase } from '../../../application/use-cases/get-impersonation-audit-logs.use-case';
import {
  ActiveImpersonationOutput,
  GetAuditLogsQueryDto,
  StartImpersonationOutput,
} from '../../../application/dtos/impersonation.dtos';

@ApiTags('Support / Impersonation')
@ApiBearerAuth('JWT-auth')
@Controller('support')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SupportController {
  constructor(
    private readonly startImpersonationUseCase: StartImpersonationUseCase,
    private readonly endImpersonationUseCase: EndImpersonationUseCase,
    private readonly getActiveImpersonationUseCase: GetActiveImpersonationUseCase,
    private readonly getImpersonationAuditLogsUseCase: GetImpersonationAuditLogsUseCase,
  ) {}

  @Post('impersonate/:clientId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sessão de suporte temporária e controlada para um cliente' })
  @ApiParam({ name: 'clientId', description: 'ID do cliente a ser acessado em suporte' })
  @ApiResponse({ status: 200, description: 'Sessão iniciada e token JWT emitido com sucesso.' })
  @ApiResponse({ status: 403, description: 'Apenas SUPER_ADMIN pode iniciar suporte ou cliente cancelado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  async startImpersonation(
    @Param('clientId') clientId: string,
    @CurrentUser('userId') superAdminUserId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<StartImpersonationOutput> {
    return this.startImpersonationUseCase.execute({
      superAdminUserId,
      targetClientId: clientId,
      ipAddress: ip,
      userAgent: userAgent || null,
    });
  }

  @Post('impersonate/end')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar sessão de suporte ativa do SUPER_ADMIN' })
  @ApiResponse({ status: 200, description: 'Sessão de suporte encerrada com sucesso.' })
  async endImpersonation(
    @CurrentUser('userId') superAdminUserId: string,
    @CurrentUser('impersonationSessionId') sessionId?: string,
  ): Promise<{ success: boolean; endedAt: string }> {
    return this.endImpersonationUseCase.execute({
      superAdminUserId,
      impersonationSessionId: sessionId || null,
      reason: 'MANUAL_LOGOUT',
    });
  }

  @Get('impersonate/active')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar status e tempo restante da sessão de suporte ativa' })
  @ApiResponse({ status: 200, description: 'Status retornado com sucesso.' })
  async getActive(
    @CurrentUser('userId') superAdminUserId: string,
  ): Promise<ActiveImpersonationOutput> {
    return this.getActiveImpersonationUseCase.execute(superAdminUserId);
  }

  @Get('audit-log')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar logs de auditoria de sessões de suporte' })
  @ApiResponse({ status: 200, description: 'Logs retornados com sucesso.' })
  async getAuditLogs(
    @Query() query: GetAuditLogsQueryDto,
  ) {
    return this.getImpersonationAuditLogsUseCase.execute({
      clientId: query.clientId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page || 1,
      limit: query.limit || 20,
    });
  }
}
