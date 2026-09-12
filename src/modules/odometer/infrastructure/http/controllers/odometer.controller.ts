import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../../auth/infrastructure/decorators/current-user.decorator';
import { UserRole } from '../../../../auth/domain/entities/user.entity';
import type { UserPayload } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';

import { RegisterOdometerReadingUseCase } from '../../../application/use-cases/register-odometer-reading.use-case';
import { CorrectOdometerReadingUseCase } from '../../../application/use-cases/correct-odometer-reading.use-case';
import { GetVehicleOdometerHistoryUseCase } from '../../../application/use-cases/get-vehicle-odometer-history.use-case';
import { GetCurrentOdometerUseCase } from '../../../application/use-cases/get-current-odometer.use-case';
import {
  RegisterOdometerReadingHttpDto,
  CorrectOdometerReadingHttpDto,
  OdometerHistoryQueryHttpDto,
} from '../dtos/odometer.dtos';
import { OdometerReading } from '../../../domain/entities/odometer-reading.entity';

@ApiTags('Odometer')
@ApiBearerAuth('JWT-auth')
@Controller('odometer')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OdometerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registerOdometerReadingUseCase: RegisterOdometerReadingUseCase,
    private readonly correctOdometerReadingUseCase: CorrectOdometerReadingUseCase,
    private readonly getVehicleOdometerHistoryUseCase: GetVehicleOdometerHistoryUseCase,
    private readonly getCurrentOdometerUseCase: GetCurrentOdometerUseCase,
  ) {}

  private async resolveClientId(user: UserPayload, vehicleId: string): Promise<string> {
    if (user.clientId) {
      return user.clientId;
    }
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { clientId: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    return vehicle.clientId;
  }

  private mapReadingToHttp(reading: OdometerReading) {
    return {
      id: reading.getId(),
      vehicleId: reading.getVehicleId(),
      clientId: reading.getClientId(),
      ownerId: reading.getOwnerId(),
      previousKm: reading.getPreviousKm().getValue(),
      currentKm: reading.getCurrentKm().getValue(),
      source: reading.getSource(),
      sourceId: reading.getSourceId(),
      recordedAt: reading.getRecordedAt().toISOString(),
      correctedFromId: reading.getCorrectedFromId(),
      reason: reading.getReason(),
      createdAt: reading.getCreatedAt().toISOString(),
    };
  }

  @Post('readings')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Registrar uma nova leitura de odômetro para um veículo' })
  @ApiResponse({ status: 201, description: 'Leitura registrada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Quilometragem inválida.' })
  @ApiResponse({ status: 422, description: 'Regressão de odômetro detectada.' })
  async register(
    @Body() dto: RegisterOdometerReadingHttpDto,
    @CurrentUser() user: UserPayload,
  ) {
    const clientId = await this.resolveClientId(user, dto.vehicleId);

    const reading = await this.registerOdometerReadingUseCase.execute({
      vehicleId: dto.vehicleId,
      clientId,
      ownerId: user.userId,
      currentKm: dto.currentKm,
      source: dto.source,
      sourceId: dto.sourceId,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
    });

    return {
      message: 'Leitura de odômetro registrada com sucesso.',
      data: this.mapReadingToHttp(reading),
    };
  }

  @Post('correct')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Correção manual de odômetro com auditoria e justificativa obrigatória' })
  @ApiResponse({ status: 200, description: 'Odômetro corrigido com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou justificativa ausente.' })
  async correct(
    @Body() dto: CorrectOdometerReadingHttpDto,
    @CurrentUser() user: UserPayload,
  ) {
    const clientId = await this.resolveClientId(user, dto.vehicleId);

    const reading = await this.correctOdometerReadingUseCase.execute({
      vehicleId: dto.vehicleId,
      clientId,
      ownerId: user.userId,
      currentKm: dto.currentKm,
      reason: dto.reason,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
    });

    return {
      message: 'Odômetro corrigido com sucesso.',
      data: this.mapReadingToHttp(reading),
    };
  }

  @Get('vehicle/:vehicleId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Consultar histórico de leituras de odômetro do veículo' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso.' })
  async getHistory(
    @Param('vehicleId') vehicleId: string,
    @Query() query: OdometerHistoryQueryHttpDto,
    @CurrentUser() user: UserPayload,
  ) {
    const clientId = await this.resolveClientId(user, vehicleId);

    const result = await this.getVehicleOdometerHistoryUseCase.execute({
      vehicleId,
      clientId,
      page: query.page,
      limit: query.limit,
      source: query.source,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return {
      data: result.readings.map((r) => this.mapReadingToHttp(r)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('vehicle/:vehicleId/current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Consultar quilometragem atual do veículo com última leitura' })
  @ApiResponse({ status: 200, description: 'Quilometragem atual retornada com sucesso.' })
  async getCurrent(
    @Param('vehicleId') vehicleId: string,
  ) {
    const result = await this.getCurrentOdometerUseCase.execute(vehicleId);

    return {
      data: {
        vehicleId: result.vehicleId,
        plate: result.plate,
        currentKm: result.currentKm,
        lastReading: result.lastReading ? this.mapReadingToHttp(result.lastReading) : null,
      },
    };
  }
}
