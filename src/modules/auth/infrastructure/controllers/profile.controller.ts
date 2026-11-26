import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  BadRequestException,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { Optional } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserPayload } from '../strategies/jwt.strategy';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import type { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import { IClientsRepository } from '../../../clients/domain/repositories/clients.repository.interface';
import { Password } from '../../domain/value-objects/password.vo';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Carlos Mendes', description: 'Nome completo do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'O nome não pode ser vazio.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  name: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'senhaAntiga123', description: 'Senha atual do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword: string;

  @ApiProperty({
    example: 'novaSenhaSegura123',
    description: 'Nova senha (mínimo 8 caracteres com letras e números)',
  })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A nova senha deve conter ao menos uma letra e um número.',
  })
  newPassword: string;
}

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    private readonly clientsRepository: IClientsRepository,
    @Optional()
    @Inject('IRefreshTokenSessionRepository')
    private readonly refreshTokenSessionRepository?: IRefreshTokenSessionRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obter dados do perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autorizado (token ausente ou inválido).' })
  async getProfile(@CurrentUser() currentUser: UserPayload) {
    const user = await this.usersRepository.findById(currentUser.userId);
    if (!user) {
      return {
        id: currentUser.userId,
        name: currentUser.email.split('@')[0] || 'Usuário',
        email: currentUser.email,
        role: currentUser.role,
        clientId: currentUser.clientId ?? null,
        clientName: null,
      };
    }

    let clientName: string | null = null;
    if (user.getClientId()) {
      const client = await this.clientsRepository.findById(user.getClientId()!);
      clientName = client?.getTradeName() ?? null;
    }

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      clientName,
      status: user.getStatus(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }

  @Put()
  @ApiOperation({ summary: 'Atualizar informações cadastrais do perfil (nome)' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    user.setName(body.name);
    await this.usersRepository.save(user);

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      status: user.getStatus(),
      updatedAt: user.getUpdatedAt(),
    };
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar a senha do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Senha atualizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta ou nova senha inválida.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const isMatch = await user.getPassword().matches(body.currentPassword);
    if (!isMatch) {
      throw new BadRequestException('A senha atual fornecida está incorreta.');
    }

    const isSameAsOld = await user.getPassword().matches(body.newPassword);
    if (isSameAsOld) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    const newPasswordVo = await Password.create(body.newPassword);
    user.changePassword(newPasswordVo);
    await this.usersRepository.save(user);

    // Revoga sessões antigas de outros dispositivos ao alterar a senha
    if (this.refreshTokenSessionRepository) {
      const activeSessions = await this.refreshTokenSessionRepository.findAllActiveByUserId(userId);
      await Promise.all(
        activeSessions.map((session) => {
          session.revoke();
          return this.refreshTokenSessionRepository!.save(session);
        }),
      );
    }

    return {
      message: 'Senha alterada com sucesso.',
    };
  }

  @Get('id')
  @ApiOperation({ summary: 'Obter o ID do usuário autenticado para vinculação multi-tenant' })
  @ApiResponse({ status: 200, description: 'ownerId retornado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async getUserId(@CurrentUser('userId') userId: string) {
    return { ownerId: userId };
  }
}