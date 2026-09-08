import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DomainExceptionFilter } from "../filters/domain-exception.filter";
import { CreateVehicleUseCase } from "../../../application/use-cases/create-vehicle.use-case";
import { ImportVehiclesCsvUseCase } from "../../../application/use-cases/import-vehicles-csv.use-case";
import { CreateVehicleDto } from "../dtos/create-vehicle.dto";
import { GetVehiclesQueryDto } from "../dtos/get-vehicles-query.dto";
import { ImportVehiclesResultDto } from "../dtos/import-vehicles-csv.dto";
import { VehiclePresenter } from "../presenters/vehicle.presenter";
import { SendVehicleToMaintenanceUseCase } from '../../../application/use-cases/send-vehicle-to-maintenance.use-case';
import { FindVehicleByIdUseCase } from '../../../application/use-cases/find-vehicle-by-id.use-case';
import { FindVehicleByPlateUseCase } from "../../../application/use-cases/find-vehicle-by-plate.use-case";
import { ListVehiclesUseCase } from "../../../application/use-cases/list-vehicles.use-case";
import { UpdateVehicleKmUseCase } from "../../../application/use-cases/update-vehicle-km.use-case";
import { UpdateVehicleKmDto } from "../dtos/update-vehicle-km.dto";
import { UpdateVehicleCrlvUseCase } from "../../../application/use-cases/update-vehicle-crlv.use-case";
import { UpdateVehicleCrlvDto } from "../dtos/update-vehicle-crlv.dto";
import { FinishVehicleMaintenanceUseCase } from '../../../application/use-cases/finish-vehicle-maintenance.use-case';
import { RolesGuard } from "../../../../auth/infrastructure/guards/roles.guard";
import { Roles } from "../../../../auth/infrastructure/decorators/roles.decorator";
import { CurrentUser } from "../../../../auth/infrastructure/decorators/current-user.decorator";
import { UserRole } from "../../../../auth/domain/entities/user.entity";


export interface UploadedMulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('Vehicles')
@ApiBearerAuth('JWT-auth') 
@Controller('vehicles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseFilters(DomainExceptionFilter)
export class VehiclesController {
    constructor(
        private readonly createVehicleUseCase: CreateVehicleUseCase,
        private readonly importVehiclesCsvUseCase: ImportVehiclesCsvUseCase,
        private readonly sendVehicleToMaintenanceUseCase: SendVehicleToMaintenanceUseCase,
        private readonly findVehicleByIdUseCase: FindVehicleByIdUseCase,
        private readonly findVehicleByPlateUseCase: FindVehicleByPlateUseCase,
        private readonly listVehiclesUseCase: ListVehiclesUseCase,
        private readonly updateVehicleKmUseCase: UpdateVehicleKmUseCase,
        private readonly updateVehicleCrlvUseCase: UpdateVehicleCrlvUseCase,
        private readonly finishVehicleMaintenanceUseCase: FinishVehicleMaintenanceUseCase,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Listar veículos da frota paginados com filtros' })
    async findAll(
        @CurrentUser('userId') userId: string,
        @CurrentUser('clientId') clientId: string | null,
        @Query() query: GetVehiclesQueryDto,
    ) {
        const result = await this.listVehiclesUseCase.execute({
            ownerId: userId,
            clientId: clientId ?? undefined,
            page: query.page,
            limit: query.limit,
            search: query.search,
            status: query.status,
        });

        return {
            data: result.data.map(VehiclePresenter.toHTTP),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        };
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
    @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Cadastrar um novo veículo na frota' })
    @ApiResponse({ status: 201, description: 'Veículo criado com sucesso.' })
    @ApiResponse({ status: 400, description: 'Dados de entrada inválidos ou placa em formato incorreto.' })
    @ApiResponse({ status: 409, description: 'Veículo com esta placa já cadastrado.' })
    async create(
        @CurrentUser('userId') userId: string,
        @CurrentUser('clientId') clientId: string | null,
        @Body() dto: CreateVehicleDto,
    ) {
        const vehicle = await this.createVehicleUseCase.execute({
            plate: dto.plate,
            brand: dto.brand,
            model: dto.model,
            year: dto.year,
            currentKm: dto.currentKm,
            crlvExpiration: dto.crlvExpiration,
            clientId: clientId ?? undefined,
            ownerId: userId,
        });
        return VehiclePresenter.toHTTP(vehicle);
    }

    @Post('import')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Importar veículos em lote via arquivo CSV' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Arquivo CSV com dados dos veículos (máx: 5MB)',
                },
            },
        },
    })
    @ApiResponse({ status: 200, type: ImportVehiclesResultDto, description: 'Resultado do processamento da importação em lote com relatório de sucessos e erros.' })
    @ApiResponse({ status: 400, description: 'Arquivo ausente, tipo inválido ou cabeçalhos obrigatórios ausentes.' })
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
        }),
    )
    async importCsv(
        @CurrentUser('userId') userId: string,
        @CurrentUser('clientId') clientId: string | null,
        @UploadedFile() file?: UploadedMulterFile,
    ): Promise<ImportVehiclesResultDto> {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo CSV foi enviado no campo "file".');
        }

        const allowedMimeTypes = [
            'text/csv',
            'text/plain',
            'application/vnd.ms-excel',
            'application/csv',
            'text/x-csv',
            'application/octet-stream',
        ];

        const isCsvExtension = file.originalname.toLowerCase().endsWith('.csv');
        const isAllowedMime = allowedMimeTypes.includes(file.mimetype.toLowerCase());

        if (!isCsvExtension && !isAllowedMime) {
            throw new BadRequestException('Formato de arquivo inválido. Apenas arquivos .csv são suportados.');
        }

        return this.importVehiclesCsvUseCase.execute({
            fileBuffer: file.buffer,
            clientId: clientId ?? undefined,
            ownerId: userId,
        });
    }

    @Post('import-csv')
    @Roles(UserRole.FLEET_MANAGER)
    @ApiOperation({ summary: 'Alias para importação de veículos em lote via arquivo CSV' })
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async importCsvAlias(
        @CurrentUser('userId') userId: string,
        @CurrentUser('clientId') clientId: string | null,
        @UploadedFile() file?: UploadedMulterFile,
    ): Promise<ImportVehiclesResultDto> {
        return this.importCsv(userId, clientId, file);
    }

    @Patch(':id/maintenance')
    @Roles(UserRole.FLEET_MANAGER)
    @ApiOperation({ summary: 'Enviar um veículo para a manutenção' })
    @ApiParam({ name: 'id', description: 'UUID do veículo' })
    @ApiResponse({ status: 200, description: 'Status do veículo alterado para IN_MAINTENANCE.' })
    @ApiResponse({ status: 404, description: 'Veículo não encontrado.' })
    @ApiResponse({ status: 422, description: 'Veículo já está em manutenção ou está em uso.' })
    async sendToMaintenanceLegacy(@Param('id') id: string) {
        return this.sendToMaintenance(id);
    }

    @Patch(':id/maintenance/send')
    @Roles(UserRole.FLEET_MANAGER)
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

    @Patch(':id/km')
    @Roles(UserRole.FLEET_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Atualizar a quilometragem atual de um veículo' })
    @ApiParam({ name: 'id', description: 'UUID do veículo' })
    @ApiResponse({ status: 200, description: 'Quilometragem atualizada com sucesso.' })
    @ApiResponse({ status: 400, description: 'Quilometragem informada menor que a atual.' })
    @ApiResponse({ status: 404, description: 'Veículo não encontrado.' })
    async updateKm(
        @Param('id') id: string,
        @Body() dto: UpdateVehicleKmDto,
    ) {
        const vehicle = await this.updateVehicleKmUseCase.execute({
            vehicleId: id,
            currentKm: dto.currentKm,
        });

        return VehiclePresenter.toHTTP(vehicle);
    }

   @Patch(':id/maintenance/finish')
    @Roles(UserRole.FLEET_MANAGER)
    @ApiOperation({ summary: 'Finalizar a manutenção de um veículo e torná-lo disponível' })
    @ApiParam({ name: 'id', description: 'UUID do veículo' })
    @ApiResponse({ status: 200, description: 'Manutenção finalizada. Status alterado para AVAILABLE.' })
    @ApiResponse({ status: 404, description: 'Veículo não encontrado.' })
    @ApiResponse({ status: 422, description: 'Veículo não está em manutenção.' })
    async finishMaintenance(@Param('id') id: string) {
        const vehicle = await this.finishVehicleMaintenanceUseCase.execute({
            vehicleId: id,
        });

        return VehiclePresenter.toHTTP(vehicle);
    }

    @Patch(':id/crlv')
    @Roles(UserRole.FLEET_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Atualizar data de vencimento do CRLV de um veículo' })
    @ApiParam({ name: 'id', description: 'UUID do veículo' })
    @ApiResponse({ status: 200, description: 'Data de vencimento do CRLV atualizada com sucesso.' })
    @ApiResponse({ status: 400, description: 'Data inválida.' })
    @ApiResponse({ status: 404, description: 'Veículo não encontrado.' })
    async updateCrlv(
        @Param('id') id: string,
        @Body() dto: UpdateVehicleCrlvDto,
    ) {
        const vehicle = await this.updateVehicleCrlvUseCase.execute({
            vehicleId: id,
            crlvExpiration: dto.crlvExpiration,
        });

        return VehiclePresenter.toHTTP(vehicle);
    }
}