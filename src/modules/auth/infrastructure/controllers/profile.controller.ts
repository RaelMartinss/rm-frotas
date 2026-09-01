import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserPayload } from '../strategies/jwt.strategy';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  async getProfile(@CurrentUser() user: UserPayload) {
    // Retorna todo o payload (userId, email, role)
    return user;
  }

  @Get('id')
  async getUserId(@CurrentUser('userId') userId: string) {
    // Retorna diretamente apenas a string do ID (ideal para isolamento multi-tenant via ownerId)
    return { ownerId: userId };
  }
}