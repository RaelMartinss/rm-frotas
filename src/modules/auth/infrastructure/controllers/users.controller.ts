import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../domain/entities/user.entity';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { CreateSubordinateUserUseCase } from '../../application/use-cases/create-subordinate-user.use-case';
import { ResetUserPasswordUseCase } from '../../application/use-cases/reset-user-password.use-case';
import { UpdateUserRoleUseCase } from '../../application/use-cases/update-user-role.use-case';
import { CreateSubordinateUserDto } from './dtos/create-subordinate-user.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';

export class ToggleUserStatusDto {
  active?: boolean;
  status?: UserStatus;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly createSubordinateUserUseCase: CreateSubordinateUserUseCase,
    private readonly resetUserPasswordUseCase: ResetUserPasswordUseCase,
    private readonly updateUserRoleUseCase: UpdateUserRoleUseCase,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuários da organização (scoped por cliente)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso.' })
  async listUsers(
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
    @CurrentUser('clientId') currentUserClientId: string | null,
    @Query('clientId') queryClientId?: string,
  ) {
    let targetClientId: string | null | undefined = currentUserClientId;

    // Se for SUPER_ADMIN, pode consultar de um cliente específico via query
    if (currentUserRole === UserRole.SUPER_ADMIN && queryClientId) {
      targetClientId = queryClientId;
    }

    const users = await this.usersRepository.findAll({
      clientId: targetClientId,
    });

    return users.map((u) => ({
      id: u.getId(),
      name: u.getName(),
      email: u.getEmail().getValue(),
      role: u.getRole(),
      status: u.getStatus(),
      isActive: u.getStatus() === UserStatus.ACTIVE,
      mustChangePassword: u.getMustChangePassword(),
      temporaryPasswordSetAt: u.getTemporaryPasswordSetAt() ?? null,
      clientId: u.getClientId() ?? null,
      createdAt: u.getCreatedAt(),
      updatedAt: u.getUpdatedAt(),
    }));
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar novo usuário subordinado (ADMIN ou DRIVER) com senha temporária' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
  async createUser(
    @CurrentUser('userId') currentUserId: string,
    @Body() body: CreateSubordinateUserDto,
  ) {
    const result = await this.createSubordinateUserUseCase.execute({
      requesterId: currentUserId,
      name: body.name,
      email: body.email,
      role: body.role,
    });

    return {
      ...result,
      message: 'Usuário cadastrado com sucesso. A senha temporária deve ser informada ao usuário para primeiro acesso.',
    };
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar papel de um usuário subordinado' })
  @ApiResponse({ status: 200, description: 'Papel do usuário atualizado com sucesso.' })
  async updateRole(
    @CurrentUser('userId') currentUserId: string,
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    const result = await this.updateUserRoleUseCase.execute({
      requesterId: currentUserId,
      targetUserId: id,
      newRole: body.role,
    });

    return {
      ...result,
      message: 'Papel do usuário atualizado com sucesso.',
    };
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar administrativamente a senha de um usuário gerando nova senha temporária' })
  @ApiResponse({ status: 200, description: 'Senha resetada com sucesso.' })
  async resetPassword(
    @CurrentUser('userId') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.resetUserPasswordUseCase.execute({
      requesterId: currentUserId,
      targetUserId: id,
    });
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar ou desativar o status de acesso de um usuário' })
  @ApiResponse({ status: 200, description: 'Status do usuário atualizado com sucesso.' })
  async toggleStatus(
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
    @CurrentUser('clientId') currentUserClientId: string | null,
    @Param('id') id: string,
    @Body() body: ToggleUserStatusDto,
  ) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Se não for SUPER_ADMIN, valida se pertence ao mesmo cliente e não é a si próprio
    if (currentUserRole !== UserRole.SUPER_ADMIN) {
      if (!currentUserClientId || user.getClientId() !== currentUserClientId) {
        throw new NotFoundException('Usuário não encontrado no escopo da sua organização.');
      }
    }

    let newStatus: UserStatus;
    if (body.status) {
      newStatus = body.status;
    } else if (body.active !== undefined) {
      newStatus = body.active ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    } else {
      newStatus = user.getStatus() === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    }

    user.setStatus(newStatus);
    await this.usersRepository.save(user);

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      status: user.getStatus(),
      isActive: user.getStatus() === UserStatus.ACTIVE,
      updatedAt: user.getUpdatedAt(),
    };
  }
}

