import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateTripUseCase } from '../../application/use-cases/create-trip.use-case';
import { StartTripUseCase } from '../../application/use-cases/start-trip.use-case';
import { CompleteTripUseCase } from '../../application/use-cases/complete-trip.use-case';
import { CreateTripHttpDto } from './dtos/create-trip-http.dto';
import { DriverNotAvailableException } from '../../application/exceptions/driver-not-available.exception';
import { VehicleNotAvailableException } from '../../application/exceptions/vehicle-not-available.exception';
import { TripNotFoundException } from '../../application/exceptions/trip-not-found.exception';
import { InvalidLocationException } from '../../domain/exceptions/invalid-location.exception';
import { InvalidTripStatusTransitionException } from '../../domain/exceptions/invalid-trip-status-transition.exception';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CancelTripUseCase } from '../../application/use-cases/cancel-trip.use-case';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@ApiTags('Trips')
@ApiBearerAuth('JWT-auth')
@Controller('trips')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TripsController {
  constructor(
    private readonly createTripUseCase: CreateTripUseCase,
    private readonly startTripUseCase: StartTripUseCase,
    private readonly completeTripUseCase: CompleteTripUseCase,
    private readonly cancelTripUseCase: CancelTripUseCase,
  ) {}

  @Post()
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar uma nova viagem para a frota' })
  @ApiResponse({ status: 201, description: 'Viagem criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos, motorista ou veículo indisponíveis.' })
  async create(@Body() dto: CreateTripHttpDto) {
    try {
      const trip = await this.createTripUseCase.execute(dto);

      return {
        id: trip.getId(),
        driverId: trip.getDriverId(),
        vehicleId: trip.getVehicleId(),
        origin: trip.getOrigin().getValue(),
        destination: trip.getDestination().getValue(),
        status: trip.getStatus(),
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
}
