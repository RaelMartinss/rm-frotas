import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'Temp#A1B2C3D4',
    description: 'Senha atual (obrigatória exceto quando mustChangePassword = true)',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    example: 'NovaSenhaForte2026',
    description: 'Nova senha de acesso (mínimo 8 caracteres com letras e números)',
  })
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve conter no mínimo 8 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A nova senha deve conter ao menos uma letra e um número.',
  })
  newPassword: string;
}
