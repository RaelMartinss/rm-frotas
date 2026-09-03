import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserPayload } from '../strategies/jwt.strategy';

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  @Get()
  @ApiOperation({ summary: 'Obter dados do perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso (userId, email, role).' })
  @ApiResponse({ status: 401, description: 'Não autorizado (token ausente ou inválido).' })
  async getProfile(@CurrentUser() user: UserPayload) {
    // Retorna todo o payload (userId, email, role)
    return user;
  }

  @Get('id')
  @ApiOperation({ summary: 'Obter o ID do usuário autenticado para vinculação multi-tenant' })
  @ApiResponse({ status: 200, description: 'ownerId retornado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async getUserId(@CurrentUser('userId') userId: string) {
    // Retorna diretamente apenas a string do ID (ideal para isolamento multi-tenant via ownerId)
    return { ownerId: userId };
  }
}