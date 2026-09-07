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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../../domain/entities/user.entity';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';

export class CreateUserDto {
  @ApiProperty({ example: 'Carlos Operador', description: 'Nome completo do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  name: string;

  @ApiProperty({ example: 'carlos@empresa.com', description: 'E-mail corporativo do usuário' })
  @IsEmail({}, { message: 'Insira um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email: string;

  @ApiProperty({ example: 'Mudar@123', description: 'Senha inicial de acesso (opcional, padrão: Mudar@123)', required: false })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password?: string;

  @ApiProperty({
    example: 'FLEET_MANAGER',
    enum: UserRole,
    description: 'Perfil de acesso do usuário (FLEET_MANAGER ou DRIVER)',
  })
  @IsEnum(UserRole, { message: 'Função do usuário inválida.' })
  role: UserRole;
}

export class ToggleUserStatusDto {
  @ApiProperty({ example: true, description: 'Define se o usuário está ativo ou inativo', required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ example: 'ACTIVE', enum: UserStatus, description: 'Status do usuário', required: false })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários cadastrados no escopo da organização' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso.' })
  async listUsers(@CurrentUser('userId') currentUserId: string) {
    const users = await this.usersRepository.findAll(currentUserId);

    return users.map((u) => ({
      id: u.getId(),
      name: u.getName(),
      email: u.getEmail().getValue(),
      role: u.getRole(),
      status: u.getStatus(),
      isActive: u.getStatus() === UserStatus.ACTIVE,
      createdAt: u.getCreatedAt(),
      updatedAt: u.getUpdatedAt(),
    }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar um novo usuário no sistema (Acesso Administrativo)' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  async createUser(@Body() body: CreateUserDto) {
    const defaultPassword = body.password && body.password.trim().length >= 6 ? body.password : 'Mudar@123';

    const user = await this.registerUserUseCase.execute({
      name: body.name,
      email: body.email,
      password: defaultPassword,
      role: body.role,
    });

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      status: user.getStatus(),
      isActive: user.getStatus() === UserStatus.ACTIVE,
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar ou desativar o status de acesso de um usuário' })
  @ApiResponse({ status: 200, description: 'Status do usuário atualizado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async toggleStatus(
    @CurrentUser('userId') currentUserId: string,
    @Param('id') id: string,
    @Body() body: ToggleUserStatusDto,
  ) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Valida se o usuário alvo pertence ao escopo do gestor autenticado
    if (user.getId() !== currentUserId) {
      const allowedUsers = await this.usersRepository.findAll(currentUserId);
      const isAllowed = allowedUsers.some((u) => u.getId() === id);
      if (!isAllowed) {
        throw new NotFoundException('Usuário não encontrado.');
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
