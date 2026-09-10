import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class LogoutAllDevicesDto {
  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'ID do usuário alvo (opcional para gestores/admins revogarem sessões de motoristas)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
