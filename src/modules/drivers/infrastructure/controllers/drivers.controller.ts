import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDriverUseCase } from '../../application/use-cases/create-driver.use-case';
import { ResetDriverPasswordUseCase } from '../../application/use-cases/reset-driver-password.use-case';
import { ActivateDriverUseCase } from '../../application/use-cases/activate-driver.use-case';
import { DeactivateDriverUseCase } from '../../application/use-cases/deactivate-driver.use-case';
import { SuspendDriverUseCase } from '../../application/use-cases/suspend-driver.use-case';
import { LiftDriverSuspensionUseCase } from '../../application/use-cases/lift-driver-suspension.use-case';
import { GetActiveSuspensionByDriverUseCase } from '../../application/use-cases/get-active-suspension-by-driver.use-case';
import { ListSuspensionsByDriverUseCase } from '../../application/use-cases/list-suspensions-by-driver.use-case';
import { ListActiveSuspensionsUseCase } from '../../application/use-cases/list-active-suspensions.use-case';
import { UpdateDriverCnhUseCase } from '../../application/use-cases/update-driver-cnh.use-case';
import { ListDriversUseCase } from '../../application/use-cases/list-drivers.use-case';
import { FindDriverByIdUseCase } from '../../application/use-cases/find-driver-by-id.use-case';
import { CreateDriverHttpDto } from './dtos/create-driver-http.dto';
import { UpdateDriverCnhHttpDto } from './dtos/update-driver-cnh-http.dto';
import { GetDriversQueryDto } from './dtos/get-drivers-query.dto';
import { SuspendDriverHttpDto } from './dtos/suspend-driver-http.dto';
import { LiftSuspensionHttpDto } from './dtos/lift-suspension-http.dto';
import { GetSuspensionsQueryDto } from './dtos/get-suspensions-query.dto';
import { DriverPresenter } from './presenters/driver.presenter';
import { DriverSuspensionPresenter } from './presenters/driver-suspension.presenter';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Drivers')
@ApiBearerAuth('JWT-auth')
@Controller('drivers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DriversController {
  constructor(
    private readonly createDriverUseCase: CreateDriverUseCase,
    private readonly resetDriverPasswordUseCase: ResetDriverPasswordUseCase,
    private readonly activateDriverUseCase: ActivateDriverUseCase,
    private readonly deactivateDriverUseCase: DeactivateDriverUseCase,
    private readonly suspendDriverUseCase: SuspendDriverUseCase,
    private readonly liftDriverSuspensionUseCase: LiftDriverSuspensionUseCase,
    private readonly getActiveSuspensionByDriverUseCase: GetActiveSuspensionByDriverUseCase,
    private readonly listSuspensionsByDriverUseCase: ListSuspensionsByDriverUseCase,
    private readonly listActiveSuspensionsUseCase: ListActiveSuspensionsUseCase,
    private readonly updateDriverCnhUseCase: UpdateDriverCnhUseCase,
    private readonly listDriversUseCase: ListDriversUseCase,
    private readonly findDriverByIdUseCase: FindDriverByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar motoristas da frota paginados com filtros' })
  async findAll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query() query: GetDriversQueryDto,
  ) {
    const result = await this.listDriversUseCase.execute({
      ownerId: userId,
      clientId: clientId ?? undefined,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
    });

    return {
      data: result.data.map(DriverPresenter.toHTTP),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('suspensions/active')
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos os motoristas atualmente suspensos na frota do gestor' })
  async listAllActiveSuspensions(
    @CurrentUser('userId') userId: string,
    @Query() query: GetSuspensionsQueryDto,
  ) {
    const result = await this.listActiveSuspensionsUseCase.execute({
      ownerId: userId,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map(DriverSuspensionPresenter.toHTTPWithDriver),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar motorista por ID' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  async findById(@Param('id') id: string) {
    const driver = await this.findDriverByIdUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Get(':id/suspensions')
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Histórico de suspensões de um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  async listDriverSuspensions(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: GetSuspensionsQueryDto,
  ) {
    const result = await this.listSuspensionsByDriverUseCase.execute({
      driverId: id,
      ownerId: userId,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data.map(DriverSuspensionPresenter.toHTTP),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id/suspensions/active')
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar a suspensão ativa de um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  async getActiveSuspension(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const suspension = await this.getActiveSuspensionByDriverUseCase.execute({
      driverId: id,
      ownerId: userId,
    });

    if (!suspension) return null;
    return DriverSuspensionPresenter.toHTTP(suspension);
  }

  @Post()
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cadastrar um novo motorista na frota com conta de acesso' })
  @ApiResponse({ status: 201, description: 'Motorista e usuário cadastrados com sucesso com senha temporária.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos ou CPF/CNH com formato incorreto.' })
  @ApiResponse({ status: 409, description: 'Motorista com este CPF, CNH ou E-mail já cadastrado.' })
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Body() dto: CreateDriverHttpDto,
  ) {
    const result = await this.createDriverUseCase.execute({
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf,
      phone: dto.phone,
      cnhNumber: dto.cnhNumber,
      cnhCategory: dto.cnhCategory,
      cnhExpirationDate: new Date(dto.cnhExpirationDate),
      clientId: clientId ?? undefined,
      ownerId: userId,
    });

    return {
      ...DriverPresenter.toHTTP(result.driver),
      temporaryPassword: result.temporaryPassword,
      user: result.user,
    };
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar administrativamente a senha do motorista gerando nova senha temporária' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Senha temporária gerada com sucesso.' })
  async resetPassword(
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
    @CurrentUser('clientId') currentUserClientId: string | null,
    @Param('id') id: string,
  ) {
    return this.resetDriverPasswordUseCase.execute({
      driverId: id,
      requesterId: currentUserId,
      requesterRole: currentUserRole,
      requesterClientId: currentUserClientId,
    });
  }

  @Post(':id/suspend')
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender motorista com registro de evento e justificativa' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista suspenso com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou data inconsistente.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  @ApiResponse({ status: 409, description: 'Motorista já suspenso ou com viagem em andamento.' })
  async suspendDriver(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Param('id') id: string,
    @Body() dto: SuspendDriverHttpDto,
  ) {
    const suspension = await this.suspendDriverUseCase.execute({
      driverId: id,
      clientId: clientId ?? undefined,
      ownerId: userId,
      suspendedBy: userId,
      reasonCategory: dto.reasonCategory,
      reasonDetails: dto.reasonDetails,
      expectedReturnDate: dto.expectedReturnDate
        ? new Date(dto.expectedReturnDate)
        : null,
      indefinite: dto.indefinite,
      attachmentUrl: dto.attachmentUrl,
    });

    return DriverSuspensionPresenter.toHTTP(suspension);
  }

  @Post(':id/lift-suspension')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar suspensão ativa e reativar o motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Suspensão encerrada e motorista reativado.' })
  @ApiResponse({ status: 404, description: 'Motorista ou suspensão ativa não encontrada.' })
  async liftSuspension(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: LiftSuspensionHttpDto,
  ) {
    const suspension = await this.liftDriverSuspensionUseCase.execute({
      driverId: id,
      ownerId: userId,
      liftedBy: userId,
      liftReason: dto.liftReason,
    });

    return DriverSuspensionPresenter.toHTTP(suspension);
  }

  @Patch(':id/activate')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar o status de um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista ativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async activate(@Param('id') id: string) {
    const driver = await this.activateDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista desativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async deactivate(@Param('id') id: string) {
    const driver = await this.deactivateDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/cnh')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar dados da CNH de um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'CNH do motorista atualizada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async updateCnh(
    @Param('id') id: string,
    @Body() dto: UpdateDriverCnhHttpDto,
  ) {
    const driver = await this.updateDriverCnhUseCase.execute({
      driverId: id,
      cnhNumber: dto.cnhNumber,
      cnhCategory: dto.cnhCategory,
      cnhExpirationDate: new Date(dto.cnhExpirationDate),
    });

    return DriverPresenter.toHTTP(driver);
  }
}