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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { OnboardClientUseCase } from '../../application/use-cases/onboard-client.use-case';
import { ListAllClientsUseCase } from '../../application/use-cases/list-all-clients.use-case';
import { GetClientByIdUseCase } from '../../application/use-cases/get-client-by-id.use-case';
import { UpdateClientProfileUseCase } from '../../application/use-cases/update-client-profile.use-case';
import { SuspendClientUseCase } from '../../application/use-cases/suspend-client.use-case';
import { ReactivateClientUseCase } from '../../application/use-cases/reactivate-client.use-case';
import { CancelClientUseCase } from '../../application/use-cases/cancel-client.use-case';
import { OnboardClientDto } from './dtos/onboard-client.dto';
import { UpdateClientDto } from './dtos/update-client.dto';
import { ListClientsDto } from './dtos/list-clients.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('v1/clients')
export class ClientsController {
  constructor(
    private readonly onboardClientUseCase: OnboardClientUseCase,
    private readonly listAllClientsUseCase: ListAllClientsUseCase,
    private readonly getClientByIdUseCase: GetClientByIdUseCase,
    private readonly updateClientProfileUseCase: UpdateClientProfileUseCase,
    private readonly suspendClientUseCase: SuspendClientUseCase,
    private readonly reactivateClientUseCase: ReactivateClientUseCase,
    private readonly cancelClientUseCase: CancelClientUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar nova empresa cliente e criar o primeiro Gestor de Frota com senha temporária' })
  @ApiResponse({ status: 201, description: 'Cliente cadastrado com sucesso.' })
  async onboard(@Body() dto: OnboardClientDto) {
    return this.onboardClientUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os clientes cadastrados (apenas Super Admin)' })
  async findAll(@Query() query: ListClientsDto) {
    const result = await this.listAllClientsUseCase.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
    });

    return {
      data: result.clients.map((c) => ({
        id: c.getId(),
        legalName: c.getLegalName(),
        tradeName: c.getTradeName(),
        document: c.getDocument().getFormatted(),
        billingEmail: c.getBillingEmail(),
        status: c.getStatus(),
        address: c.getAddress()?.toJSON() ?? null,
        createdAt: c.getCreatedAt(),
        updatedAt: c.getUpdatedAt(),
      })),
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um cliente por ID' })
  async findById(@Param('id') id: string) {
    const client = await this.getClientByIdUseCase.execute(id);
    return {
      id: client.getId(),
      legalName: client.getLegalName(),
      tradeName: client.getTradeName(),
      document: client.getDocument().getFormatted(),
      billingEmail: client.getBillingEmail(),
      status: client.getStatus(),
      address: client.getAddress()?.toJSON() ?? null,
      createdAt: client.getCreatedAt(),
      updatedAt: client.getUpdatedAt(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar informações cadastrais da empresa cliente' })
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    const client = await this.updateClientProfileUseCase.execute({
      id,
      legalName: dto.legalName,
      tradeName: dto.tradeName,
      billingEmail: dto.billingEmail,
      address: dto.address,
    });

    return {
      id: client.getId(),
      legalName: client.getLegalName(),
      tradeName: client.getTradeName(),
      document: client.getDocument().getFormatted(),
      billingEmail: client.getBillingEmail(),
      status: client.getStatus(),
      address: client.getAddress()?.toJSON() ?? null,
      createdAt: client.getCreatedAt(),
      updatedAt: client.getUpdatedAt(),
    };
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspender acesso da empresa cliente e de todos os seus usuários' })
  async suspend(@Param('id') id: string) {
    const client = await this.suspendClientUseCase.execute(id);
    return {
      id: client.getId(),
      status: client.getStatus(),
      message: 'Cliente suspenso com sucesso. O login e renovação de token dos usuários vinculados foram bloqueados.',
    };
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reativar empresa cliente suspensa' })
  async reactivate(@Param('id') id: string) {
    const client = await this.reactivateClientUseCase.execute(id);
    return {
      id: client.getId(),
      status: client.getStatus(),
      message: 'Cliente reativado com sucesso.',
    };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar contrato da empresa cliente' })
  async cancel(@Param('id') id: string) {
    const client = await this.cancelClientUseCase.execute(id);
    return {
      id: client.getId(),
      status: client.getStatus(),
      message: 'Cliente cancelado com sucesso.',
    };
  }
}
