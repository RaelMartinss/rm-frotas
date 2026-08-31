import { Body, Controller, Get, Param, Patch, Post, UseFilters } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DomainExceptionFilter } from "../filters/domain-exception.filter";
import { CreateVehicleUseCase } from "../../../application/use-cases/create-vehicle.use-case";
import { CreateVehicleDto } from "../dtos/create-vehicle.dto";
import { VehiclePresenter } from "../presenters/vehicle.presenter";
import { SendVehicleToMaintenanceUseCase } from '../../../application/use-cases/send-vehicle-to-maintenance.use-case';
import { FindVehicleByIdUseCase } from '../../../application/use-cases/find-vehicle-by-id.use-case';
import { FindVehicleByPlateUseCase } from "../../../application/use-cases/find-vehicle-by-plate.use-case";
import { ListVehiclesUseCase } from "../../../application/use-cases/list-vehicles.use-case";


@ApiTags('Vehicles')
@Controller('vehicles')
@UseFilters(DomainExceptionFilter)
export class VehiclesController {
    constructor(
        private readonly createVehicleUseCase: CreateVehicleUseCase,
        private readonly sendVehicleToMaintenanceUseCase: SendVehicleToMaintenanceUseCase,
        private readonly findVehicleByIdUseCase: FindVehicleByIdUseCase,
        private readonly findVehicleByPlateUseCase: FindVehicleByPlateUseCase,
        private readonly listVehiclesUseCase: ListVehiclesUseCase,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Listar todos os veículos da frota' })
    async findAll() {
        const vehicle = await this.listVehiclesUseCase.execute();
        return vehicle.map(VehiclePresenter.toHTTP);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar veículo por ID' })
    @ApiParam({ name: 'id', description: 'UUID do veículo' })
    async findById(@Param('id') id: string) {
        const vehicle = await this.findVehicleByIdUseCase.execute(id);
        return VehiclePresenter.toHTTP(vehicle);
    }

    @Get('plate/:plate')
    @ApiOperation({ summary: 'Buscar veículo por Placa' })
    @ApiParam({ name: 'plate', description: 'Placa do veículo (ex: ABC1234)' })
    async findByPlate(@Param('plate') plate: string) {
        const vehicle = await this.findVehicleByPlateUseCase.execute(plate);
        return VehiclePresenter.toHTTP(vehicle);
    }

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

    @Patch(':id/maintenance')
    @ApiOperation({ summary: 'Enviar um veículo para a manutenção' })
    @ApiParam({ name: 'id', description: 'UUID do veículo' })
    @ApiResponse({ status: 200, description: 'Status do veículo alterado para IN_MAINTENANCE.' })
    @ApiResponse({ status: 404, description: 'Veículo não encontrado.' })
    @ApiResponse({ status: 422, description: 'Veículo já está em manutenção ou está em uso.' })
    async sendToMaintenance(@Param('id') id: string) {
        const vehicle = await this.sendVehicleToMaintenanceUseCase.execute({
        vehicleId: id,
        });

        return VehiclePresenter.toHTTP(vehicle);
    }


}