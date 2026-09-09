import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateTripUseCase } from '../../application/use-cases/create-trip.use-case';
import { GetTripsUseCase } from '../../application/use-cases/get-trips.use-case';
import { StartTripUseCase } from '../../application/use-cases/start-trip.use-case';
import { CompleteTripUseCase } from '../../application/use-cases/complete-trip.use-case';
import { CreateTripHttpDto } from './dtos/create-trip-http.dto';
import { GetTripsQueryDto } from '../http/dtos/get-trips-query.dto';
import { DriverNotAvailableException } from '../../application/exceptions/driver-not-available.exception';
import { VehicleNotAvailableException } from '../../application/exceptions/vehicle-not-available.exception';
import { TripNotFoundException } from '../../application/exceptions/trip-not-found.exception';
import { InvalidLocationException } from '../../domain/exceptions/invalid-location.exception';
import { InvalidTripStatusTransitionException } from '../../domain/exceptions/invalid-trip-status-transition.exception';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CancelTripUseCase } from '../../application/use-cases/cancel-trip.use-case';
import { GetTripAvailabilityUseCase } from '../../application/use-cases/get-trip-availability.use-case';
import { GetTripRouteUseCase } from '../../application/use-cases/get-trip-route.use-case';
import { VehiclePresenter } from '../../../vehicles/infrastructure/http/presenters/vehicle.presenter';
import { DriverPresenter } from '../../../drivers/infrastructure/controllers/presenters/driver.presenter';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@ApiTags('Trips')
@ApiBearerAuth('JWT-auth')
@Controller('trips')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TripsController {
  constructor(
    private readonly createTripUseCase: CreateTripUseCase,
    private readonly getTripsUseCase: GetTripsUseCase,
    private readonly startTripUseCase: StartTripUseCase,
    private readonly completeTripUseCase: CompleteTripUseCase,
    private readonly cancelTripUseCase: CancelTripUseCase,
    private readonly getTripAvailabilityUseCase: GetTripAvailabilityUseCase,
    private readonly getTripRouteUseCase: GetTripRouteUseCase,
  ) {}

  @Get('availability')
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter veículos e motoristas disponíveis para alocação em viagem' })
  @ApiResponse({
    status: 200,
    description: 'Listas de veículos e motoristas disponíveis retornadas com sucesso.',
  })
  async getAvailability(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query('excludeTripId') excludeTripId?: string,
  ) {
    const result = await this.getTripAvailabilityUseCase.execute({
      clientId: clientId ?? undefined,
      ownerId: userId,
      excludeTripId,
    });

    return {
      vehicles: result.vehicles.map(VehiclePresenter.toHTTP),
      drivers: result.drivers.map(DriverPresenter.toHTTP),
    };
  }

  @Get()
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar viagens paginadas com filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de viagens retornada com sucesso.',
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Query() query: GetTripsQueryDto,
  ) {
    const result = await this.getTripsUseCase.execute({
      ...query,
      clientId: clientId ?? undefined,
      ownerId: userId,
    });

    return {
      ...result,
      data: result.data.map((trip) => ({
        id: trip.getId(),
        driverId: trip.getDriverId(),
        vehicleId: trip.getVehicleId(),
        origin: trip.getOrigin().getValue(),
        destination: trip.getDestination().getValue(),
        originAddress: trip.getOrigin().getAddress(),
        originCity: trip.getOrigin().getCity(),
        originState: trip.getOrigin().getState(),
        destinationAddress: trip.getDestination().getAddress(),
        destinationCity: trip.getDestination().getCity(),
        destinationState: trip.getDestination().getState(),
        status: trip.getStatus(),
        scheduledDate: trip.getScheduledDate(),
        startedAt: trip.getStartedAt(),
        completedAt: trip.getCompletedAt(),
        createdAt: trip.getCreatedAt(),
        updatedAt: trip.getUpdatedAt(),
      })),
    };
  }

  @Post()
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar uma nova viagem para a frota' })
  @ApiResponse({ status: 201, description: 'Viagem criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos, motorista ou veículo indisponíveis.' })
  async create(
    @CurrentUser('clientId') clientId: string | null,
    @Body() dto: CreateTripHttpDto,
  ) {
    try {
      const trip = await this.createTripUseCase.execute({
        ...dto,
        clientId: clientId ?? undefined,
      });

      return {
        id: trip.getId(),
        driverId: trip.getDriverId(),
        vehicleId: trip.getVehicleId(),
        origin: trip.getOrigin().getValue(),
        destination: trip.getDestination().getValue(),
        status: trip.getStatus(),
        scheduledDate: trip.getScheduledDate(),
        createdAt: trip.getCreatedAt(),
      };
    } catch (error) {
      if (
        error instanceof DriverNotAvailableException ||
        error instanceof VehicleNotAvailableException ||
        error instanceof InvalidLocationException
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/start')
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar uma viagem cadastrada' })
  @ApiParam({ name: 'id', description: 'UUID da viagem' })
  @ApiResponse({ status: 200, description: 'Viagem iniciada com sucesso (status IN_PROGRESS).' })
  @ApiResponse({ status: 400, description: 'Transição de status inválida.' })
  @ApiResponse({ status: 404, description: 'Viagem não encontrada.' })
  async start(@Param('id') id: string) {
    try {
      const trip = await this.startTripUseCase.execute({ tripId: id });

      return {
        id: trip.getId(),
        status: trip.getStatus(),
        startedAt: trip.getStartedAt(),
        updatedAt: trip.getUpdatedAt(),
      };
    } catch (error) {
      if (error instanceof TripNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidTripStatusTransitionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/complete')
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Concluir uma viagem em andamento' })
  @ApiParam({ name: 'id', description: 'UUID da viagem' })
  @ApiResponse({ status: 200, description: 'Viagem concluída com sucesso (status COMPLETED).' })
  @ApiResponse({ status: 400, description: 'Transição de status inválida.' })
  @ApiResponse({ status: 404, description: 'Viagem não encontrada.' })
  async complete(@Param('id') id: string) {
    try {
      const trip = await this.completeTripUseCase.execute({ tripId: id });

      return {
        id: trip.getId(),
        status: trip.getStatus(),
        completedAt: trip.getCompletedAt(),
        updatedAt: trip.getUpdatedAt(),
      };
    } catch (error) {
      if (error instanceof TripNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidTripStatusTransitionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/cancel')
  @Roles(UserRole.FLEET_MANAGER, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar uma viagem' })
  @ApiParam({ name: 'id', description: 'UUID da viagem' })
  @ApiResponse({ status: 200, description: 'Viagem cancelada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Regra de negócio violada (ex: viagem já concluída).',
  })
  async cancel(@Param('id') id: string) {
    const trip = await this.cancelTripUseCase.execute({ tripId: id });
    return {
      id: trip.getId(),
      status: trip.getStatus(),
      updatedAt: trip.getUpdatedAt(),
    };
  }

  @Get(':id/route')
  @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN, UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar histórico de localização e rota da viagem' })
  @ApiParam({ name: 'id', description: 'UUID da viagem' })
  @ApiResponse({ status: 200, description: 'Rota e telemetria da viagem retornadas com sucesso.' })
  @ApiResponse({ status: 404, description: 'Viagem não encontrada.' })
  async getRoute(
    @CurrentUser('userId') userId: string,
    @CurrentUser('clientId') clientId: string | null,
    @Param('id') id: string,
  ) {
    return this.getTripRouteUseCase.execute({
      tripId: id,
      clientId: clientId ?? undefined,
      ownerId: userId,
    });
  }
}
