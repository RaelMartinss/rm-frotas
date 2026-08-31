import { Body, Controller, Post, UseFilters } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DomainExceptionFilter } from "../filters/domain-exception.filter";
import { CreateVehicleUseCase } from "../../../application/use-cases/create-vehicle.use-case";
import { CreateVehicleDto } from "../dtos/create-vehicle.dto";
import { VehiclePresenter } from "../presenters/vehicle.presenter";


@ApiTags('Vehicle')
@Controller('vehicles')
@UseFilters(DomainExceptionFilter)
export class VehiclesController {
    constructor(private readonly createVehicleUseCase: CreateVehicleUseCase) {}

    @Post()
    @ApiOperation({ summary: 'Cadastrar um novo veículo na frota' })
    @ApiResponse({ status: 201, description: 'Veículo criado com sucesso.' })
    @ApiResponse({ status: 400, description: 'Dados de entrada inválidos ou placa em formato incorreto.' })
    @ApiResponse({ status: 409, description: 'Veículo com esta placa já cadastrado.' })
    async create(@Body() dto: CreateVehicleDto) {
        const vehicle = await this.createVehicleUseCase.execute({
            plate: dto.plate,
            model: dto.model,
            year: dto.year,
            currentKm: dto.currentKm,
        });
        return VehiclePresenter.toHTTP(vehicle);
    }
}