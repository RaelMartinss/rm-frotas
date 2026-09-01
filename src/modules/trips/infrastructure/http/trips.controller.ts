import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateTripUseCase } from '../../application/use-cases/create-trip.use-case';
import { CreateTripHttpDto } from '../controllers/dtos/create-trip-http.dto';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly createTripUseCase: CreateTripUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar uma nova viagem' })
  @ApiResponse({ status: 201, description: 'Viagem criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'Motorista ou veículo indisponível.' })
  async create(@Body() dto: CreateTripHttpDto) {
    const trip = await this.createTripUseCase.execute(dto);
    return {
      id: trip.getId(),
      driverId: trip.getDriverId(),
      vehicleId: trip.getVehicleId(),
      status: trip.getStatus(),
    };
  }
}