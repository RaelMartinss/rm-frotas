import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDriverUseCase } from '../../application/use-cases/create-driver.use-case';
import { ActivateDriverUseCase } from '../../application/use-cases/activate-driver.use-case';
import { DeactivateDriverUseCase } from '../../application/use-cases/deactivate-driver.use-case';
import { SuspendDriverUseCase } from '../../application/use-cases/suspend-driver.use-case';
import { UpdateDriverCnhUseCase } from '../../application/use-cases/update-driver-cnh.use-case';
import { ListDriversUseCase } from '../../application/use-cases/list-drivers.use-case';
import { FindDriverByIdUseCase } from '../../application/use-cases/find-driver-by-id.use-case';
import { CreateDriverHttpDto } from './dtos/create-driver-http.dto';
import { UpdateDriverCnhHttpDto } from './dtos/update-driver-cnh-http.dto';
import { DriverPresenter } from './presenters/driver.presenter';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Drivers')
@ApiBearerAuth('JWT-auth')
@Controller('drivers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DriversController {
  constructor(
    private readonly createDriverUseCase: CreateDriverUseCase,
    private readonly activateDriverUseCase: ActivateDriverUseCase,
    private readonly deactivateDriverUseCase: DeactivateDriverUseCase,
    private readonly suspendDriverUseCase: SuspendDriverUseCase,
    private readonly updateDriverCnhUseCase: UpdateDriverCnhUseCase,
    private readonly listDriversUseCase: ListDriversUseCase,
    private readonly findDriverByIdUseCase: FindDriverByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os motoristas da frota' })
  async findAll() {
    const drivers = await this.listDriversUseCase.execute();
    return drivers.map(DriverPresenter.toHTTP);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar motorista por ID' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  async findById(@Param('id') id: string) {
    const driver = await this.findDriverByIdUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Post()
  @Roles(UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Cadastrar um novo motorista na frota' })
  @ApiResponse({ status: 201, description: 'Motorista cadastrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos ou CPF/CNH com formato incorreto.' })
  @ApiResponse({ status: 409, description: 'Motorista com este CPF ou CNH já cadastrado.' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDriverHttpDto,
  ) {
    const driver = await this.createDriverUseCase.execute({
      name: dto.name,
      cpf: dto.cpf,
      cnhNumber: dto.cnhNumber,
      cnhCategory: dto.cnhCategory,
      cnhExpirationDate: new Date(dto.cnhExpirationDate),
      ownerId: userId,
    });

    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/activate')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar o status de um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista ativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async activate(@Param('id') id: string) {
    const driver = await this.activateDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista desativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async deactivate(@Param('id') id: string) {
    const driver = await this.deactivateDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender um motorista temporariamente' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'Motorista suspenso com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async suspend(@Param('id') id: string) {
    const driver = await this.suspendDriverUseCase.execute(id);
    return DriverPresenter.toHTTP(driver);
  }

  @Patch(':id/cnh')
  @Roles(UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar dados da CNH de um motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista' })
  @ApiResponse({ status: 200, description: 'CNH do motorista atualizada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado.' })
  async updateCnh(
    @Param('id') id: string,
    @Body() dto: UpdateDriverCnhHttpDto,
  ) {
    const driver = await this.updateDriverCnhUseCase.execute({
      driverId: id,
      cnhNumber: dto.cnhNumber,
      cnhCategory: dto.cnhCategory,
      cnhExpirationDate: new Date(dto.cnhExpirationDate),
    });

    return DriverPresenter.toHTTP(driver);
  }
}