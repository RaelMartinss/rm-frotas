import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../../auth/infrastructure/decorators/current-user.decorator';
import { UserRole } from '../../../../auth/domain/entities/user.entity';
import type { UserPayload } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';

import { RegisterFuelRecordUseCase } from '../../../application/use-cases/register-fuel-record.use-case';
import { UpdateFuelRecordUseCase } from '../../../application/use-cases/update-fuel-record.use-case';
import { DeleteFuelRecordUseCase } from '../../../application/use-cases/delete-fuel-record.use-case';
import { GetFuelRecordByIdUseCase } from '../../../application/use-cases/get-fuel-record-by-id.use-case';
import { ListFuelRecordsUseCase } from '../../../application/use-cases/list-fuel-records.use-case';
import { GetFuelConsumptionReportUseCase } from '../../../application/use-cases/get-fuel-consumption-report.use-case';
import { GetFuelCostStatsUseCase } from '../../../application/use-cases/get-fuel-cost-stats.use-case';

import {
  CreateFuelRecordDto,
  UpdateFuelRecordDto,
  ListFuelRecordsQueryDto,
  GetConsumptionReportQueryDto,
  GetCostStatsQueryDto,
} from '../dtos/fuel-record.dtos';
import { FuelRecord } from '../../../domain/entities/fuel-record.entity';
import { FuelRecordWithRelations } from '../../../domain/repositories/fuel-records.repository';

@ApiTags('Fuel')
@ApiBearerAuth('JWT-auth')
@Controller('fuel-records')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FuelRecordsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registerFuelRecordUseCase: RegisterFuelRecordUseCase,
    private readonly updateFuelRecordUseCase: UpdateFuelRecordUseCase,
    private readonly deleteFuelRecordUseCase: DeleteFuelRecordUseCase,
    private readonly getFuelRecordByIdUseCase: GetFuelRecordByIdUseCase,
    private readonly listFuelRecordsUseCase: ListFuelRecordsUseCase,
    private readonly getFuelConsumptionReportUseCase: GetFuelConsumptionReportUseCase,
    private readonly getFuelCostStatsUseCase: GetFuelCostStatsUseCase
  ) {}

  private async resolveUserContext(user: UserPayload): Promise<{ ownerId: string; driverId?: string }> {
    if (user.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findFirst({
        where: { userId: user.userId },
      });

      if (!driver) {
        throw new ForbiddenException(
          'Perfil de motorista não encontrado para esta conta de usuário.'
        );
      }

      return {
        ownerId: driver.ownerId,
        driverId: driver.id,
      };
    }

    return {
      ownerId: user.userId,
    };
  }

  private mapFuelRecordToHttp(item: FuelRecordWithRelations | FuelRecord) {
    const record = item instanceof FuelRecord ? item : item.fuelRecord;
    const vehicle = item instanceof FuelRecord ? undefined : item.vehicle;
    const driver = item instanceof FuelRecord ? undefined : item.driver;

    return {
      id: record.getId(),
      vehicleId: record.getVehicleId(),
      driverId: record.getDriverId(),
      ownerId: record.getOwnerId(),
      fuelType: record.getFuelType(),
      liters: record.getLiters(),
      pricePerUnit: record.getPricePerUnit().amount,
      totalCost: record.getTotalCost().amount,
      odometerAtFueling: record.getOdometerAtFueling(),
      gasStation: record.getGasStation(),
      fullTank: record.isFullTank(),
      receiptUrl: record.getReceiptUrl(),
      fueledAt: record.getFueledAt(),
      notes: record.getNotes(),
      createdAt: record.getCreatedAt(),
      updatedAt: record.getUpdatedAt(),
      vehicle,
      driver,
    };
  }

  @Post()
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar um novo abastecimento de veículo' })
  @ApiResponse({ status: 201, description: 'Abastecimento registrado com sucesso.' })
  async create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateFuelRecordDto
  ) {
    const context = await this.resolveUserContext(user);

    const driverId = context.driverId ?? dto.driverId;
    if (!driverId) {
      throw new BadRequestException('O motorista responsável é obrigatório.');
    }

    const record = await this.registerFuelRecordUseCase.execute({
      ownerId: context.ownerId,
      vehicleId: dto.vehicleId,
      driverId,
      fuelType: dto.fuelType,
      liters: dto.liters,
      pricePerUnit: dto.pricePerUnit,
      totalCost: dto.totalCost,
      odometerAtFueling: dto.odometerAtFueling,
      gasStation: dto.gasStation,
      fullTank: dto.fullTank,
      receiptUrl: dto.receiptUrl,
      fueledAt: dto.fueledAt ? new Date(dto.fueledAt) : undefined,
      notes: dto.notes,
    });

    return this.mapFuelRecordToHttp(record);
  }

  @Get('consumption-report')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter relatório de eficiência e consumo médio (km/l) da frota' })
  async getConsumptionReport(
    @CurrentUser() user: UserPayload,
    @Query() query: GetConsumptionReportQueryDto
  ) {
    const context = await this.resolveUserContext(user);

    return this.getFuelConsumptionReportUseCase.execute({
      ownerId: context.ownerId,
      vehicleId: query.vehicleId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('cost-stats')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter estatísticas agregadas de gastos com combustível' })
  async getCostStats(
    @CurrentUser() user: UserPayload,
    @Query() query: GetCostStatsQueryDto
  ) {
    const context = await this.resolveUserContext(user);

    return this.getFuelCostStatsUseCase.execute({
      ownerId: context.ownerId,
      vehicleId: query.vehicleId,
      driverId: query.driverId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get()
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar registros de abastecimento paginados com filtros' })
  async list(
    @CurrentUser() user: UserPayload,
    @Query() query: ListFuelRecordsQueryDto
  ) {
    const context = await this.resolveUserContext(user);

    const result = await this.listFuelRecordsUseCase.execute({
      ownerId: context.ownerId,
      callerDriverId: context.driverId,
      vehicleId: query.vehicleId,
      driverId: query.driverId,
      fuelType: query.fuelType,
      fullTank: query.fullTank,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.records.map((r) => this.mapFuelRecordToHttp(r)),
      meta: {
        total: result.total,
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        totalPages: Math.ceil(result.total / (query.limit ?? 10)),
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter detalhes de um registro de abastecimento' })
  async getById(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string
  ) {
    const context = await this.resolveUserContext(user);

    const record = await this.getFuelRecordByIdUseCase.execute({
      id,
      ownerId: context.ownerId,
      driverId: context.driverId,
    });

    return this.mapFuelRecordToHttp(record);
  }

  @Patch(':id')
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar informações de um abastecimento' })
  async update(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFuelRecordDto
  ) {
    const context = await this.resolveUserContext(user);

    const record = await this.updateFuelRecordUseCase.execute({
      id,
      ownerId: context.ownerId,
      driverId: context.driverId,
      fuelType: dto.fuelType,
      liters: dto.liters,
      pricePerUnit: dto.pricePerUnit,
      totalCost: dto.totalCost,
      gasStation: dto.gasStation,
      fullTank: dto.fullTank,
      receiptUrl: dto.receiptUrl,
      fueledAt: dto.fueledAt ? new Date(dto.fueledAt) : undefined,
      notes: dto.notes,
    });

    return this.mapFuelRecordToHttp(record);
  }

  @Delete(':id')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um registro de abastecimento (restrito a gestores)' })
  async delete(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string
  ) {
    const context = await this.resolveUserContext(user);

    await this.deleteFuelRecordUseCase.execute({
      id,
      ownerId: context.ownerId,
    });
  }
}
