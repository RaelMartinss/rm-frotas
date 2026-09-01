import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateTripUseCase } from '../../application/use-cases/create-trip.use-case';
import { CreateTripHttpDto } from '../controllers/dtos/create-trip-http.dto';
import { GetTripsQueryDto } from './dtos/get-trips-query.dto';
import { GetTripsUseCase } from '../../application/use-cases/get-trips.use-case';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(
    private readonly createTripUseCase: CreateTripUseCase,
    private readonly getTripsUseCase: GetTripsUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar uma nova viagem' })
  @ApiResponse({ status: 201, description: 'Viagem criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({
    status: 409,
    description: 'Motorista ou veículo indisponível.',
  })
  async create(@Body() dto: CreateTripHttpDto) {
    const trip = await this.createTripUseCase.execute(dto);
    return {
      id: trip.getId(),
      driverId: trip.getDriverId(),
      vehicleId: trip.getVehicleId(),
      status: trip.getStatus(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar viagens paginadas com filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de viagens retornada com sucesso.',
  })
  async findAll(@Query() query: GetTripsQueryDto) {
    const result = await this.getTripsUseCase.execute(query);

    return {
      ...result,
      data: result.data.map((trip) => ({
        id: trip.getId(),
        driverId: trip.getDriverId(),
        vehicleId: trip.getVehicleId(),
        status: trip.getStatus(),
        startedAt: trip.getStartedAt(),
        completedAt: trip.getCompletedAt(),
        createdAt: trip.getCreatedAt(),
      })),
    };
  }
}
