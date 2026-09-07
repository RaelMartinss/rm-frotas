import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../../auth/infrastructure/guards/roles.guard';
import { CurrentUser } from '../../../../auth/infrastructure/decorators/current-user.decorator';
import { ScheduleMaintenanceUseCase } from '../../../application/use-cases/schedule-maintenance.use-case';
import { StartMaintenanceUseCase } from '../../../application/use-cases/start-maintenance.use-case';
import { FinishMaintenanceUseCase } from '../../../application/use-cases/finish-maintenance.use-case';
import { CancelMaintenanceUseCase } from '../../../application/use-cases/cancel-maintenance.use-case';
import { UpdateMaintenanceUseCase } from '../../../application/use-cases/update-maintenance.use-case';
import { GetMaintenanceByIdUseCase } from '../../../application/use-cases/get-maintenance-by-id.use-case';
import { ListMaintenancesUseCase } from '../../../application/use-cases/list-maintenances.use-case';
import { GetMaintenanceStatsUseCase } from '../../../application/use-cases/get-maintenance-stats.use-case';
import {
  CancelMaintenanceDto,
  CreateMaintenanceDto,
  FinishMaintenanceDto,
  ListMaintenancesQueryDto,
  StartMaintenanceDto,
  UpdateMaintenanceDto,
} from '../dtos/maintenance.dtos';
import { Maintenance } from '../../../domain/entities/maintenance.entity';
import { MaintenanceWithVehicleDetails } from '../../../domain/repositories/maintenances.repository';

@Controller('v1/maintenances')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MaintenancesController {
  constructor(
    private readonly scheduleMaintenanceUseCase: ScheduleMaintenanceUseCase,
    private readonly startMaintenanceUseCase: StartMaintenanceUseCase,
    private readonly finishMaintenanceUseCase: FinishMaintenanceUseCase,
    private readonly cancelMaintenanceUseCase: CancelMaintenanceUseCase,
    private readonly updateMaintenanceUseCase: UpdateMaintenanceUseCase,
    private readonly getMaintenanceByIdUseCase: GetMaintenanceByIdUseCase,
    private readonly listMaintenancesUseCase: ListMaintenancesUseCase,
    private readonly getMaintenanceStatsUseCase: GetMaintenanceStatsUseCase
  ) {}

  private mapMaintenanceToHttp(maintenance: Maintenance, vehicle?: any) {
    return {
      id: maintenance.getId(),
      vehicleId: maintenance.getVehicleId(),
      ownerId: maintenance.getOwnerId(),
      type: maintenance.getType(),
      status: maintenance.getStatus(),
      description: maintenance.getDescription(),
      serviceProvider: maintenance.getServiceProvider(),
      scheduledDate: maintenance.getScheduledDate(),
      startedAt: maintenance.getStartedAt(),
      finishedAt: maintenance.getFinishedAt(),
      odometerAtService: maintenance.getOdometerAtService(),
      cost: maintenance.getCost().amount,
      items: maintenance.getItems().map((i) => ({
        id: i.id,
        name: i.name,
        cost: i.cost.amount,
        quantity: i.quantity,
        total: i.getTotal().amount,
      })),
      createdAt: maintenance.getCreatedAt(),
      updatedAt: maintenance.getUpdatedAt(),
      vehicle: vehicle ?? undefined,
    };
  }

  @Post()
  async create(
    @CurrentUser('userId') ownerId: string,
    @Body() dto: CreateMaintenanceDto
  ) {
    const maintenance = await this.scheduleMaintenanceUseCase.execute({
      ownerId,
      vehicleId: dto.vehicleId,
      type: dto.type,
      description: dto.description,
      serviceProvider: dto.serviceProvider,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      items: dto.items,
    });

    return this.mapMaintenanceToHttp(maintenance);
  }

  @Post('start')
  async startDirect(
    @CurrentUser('userId') ownerId: string,
    @Body() dto: StartMaintenanceDto
  ) {
    const maintenance = await this.startMaintenanceUseCase.execute({
      ownerId,
      vehicleId: dto.vehicleId,
      type: dto.type,
      description: dto.description,
      serviceProvider: dto.serviceProvider,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
    });

    return this.mapMaintenanceToHttp(maintenance);
  }

  @Post(':id/start')
  async start(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string,
    @Body() dto: StartMaintenanceDto
  ) {
    const maintenance = await this.startMaintenanceUseCase.execute({
      ownerId,
      maintenanceId: id,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
    });

    return this.mapMaintenanceToHttp(maintenance);
  }

  @Post(':id/finish')
  async finish(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string,
    @Body() dto: FinishMaintenanceDto
  ) {
    const maintenance = await this.finishMaintenanceUseCase.execute({
      ownerId,
      maintenanceId: id,
      odometerAtService: dto.odometerAtService,
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : new Date(),
      items: dto.items,
      cost: dto.cost,
    });

    return this.mapMaintenanceToHttp(maintenance);
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string,
    @Body() dto: CancelMaintenanceDto
  ) {
    const maintenance = await this.cancelMaintenanceUseCase.execute({
      ownerId,
      maintenanceId: id,
      reason: dto.reason,
    });

    return this.mapMaintenanceToHttp(maintenance);
  }

  @Patch(':id')
  async update(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto
  ) {
    const maintenance = await this.updateMaintenanceUseCase.execute({
      ownerId,
      maintenanceId: id,
      description: dto.description,
      serviceProvider: dto.serviceProvider,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      type: dto.type,
      items: dto.items,
      cost: dto.cost,
    });

    return this.mapMaintenanceToHttp(maintenance);
  }

  @Get('stats')
  async getStats(
    @CurrentUser('userId') ownerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.getMaintenanceStatsUseCase.execute({
      ownerId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get(':id')
  async getById(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string
  ) {
    const result = await this.getMaintenanceByIdUseCase.execute({
      ownerId,
      maintenanceId: id,
    });

    return this.mapMaintenanceToHttp(result.maintenance, result.vehicle);
  }

  @Get()
  async list(
    @CurrentUser('userId') ownerId: string,
    @Query() query: ListMaintenancesQueryDto
  ) {
    const result = await this.listMaintenancesUseCase.execute({
      ownerId,
      vehicleId: query.vehicleId,
      status: query.status,
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.maintenances.map((item) =>
        this.mapMaintenanceToHttp(item.maintenance, item.vehicle)
      ),
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };
  }
}
