import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'Temp#A1B2C3D4', description: 'Senha atual ou temporária (opcional se primeiro login)' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'NovaSenhaForte@2026', description: 'Nova senha de acesso (mínimo 6 caracteres)' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword: string;
}
