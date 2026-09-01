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
} from '@nestjs/common';
import { CreateTripUseCase } from '../../application/use-cases/create-trip.use-case';
import { StartTripUseCase } from '../../application/use-cases/start-trip.use-case';
import { CompleteTripUseCase } from '../../application/use-cases/complete-trip.use-case';
import { CreateTripHttpDto } from './dtos/create-trip-http.dto';
import { DriverNotAvailableException } from '../../application/exceptions/driver-not-available.exception';
import { VehicleNotAvailableException } from '../../application/exceptions/vehicle-not-available.exception';
import { TripNotFoundException } from '../../application/exceptions/trip-not-found.exception';
import { InvalidLocationException } from '../../domain/exceptions/invalid-location.exception';
import { InvalidTripStatusTransitionException } from '../../domain/exceptions/invalid-trip-status-transition.exception';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CancelTripUseCase } from '../../application/use-cases/cancel-trip.use-case';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly createTripUseCase: CreateTripUseCase,
    private readonly startTripUseCase: StartTripUseCase,
    private readonly completeTripUseCase: CompleteTripUseCase,
    private readonly cancelTripUseCase: CancelTripUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar uma viagem' })
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
