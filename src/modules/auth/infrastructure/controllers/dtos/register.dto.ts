import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../domain/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'Rael Martins', description: 'Nome completo do usuário' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rael@frotas.com', description: 'E-mail do usuário' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'senhaSegura123', description: 'Senha de acesso (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password: string;

  @ApiProperty({
    example: 'FLEET_MANAGER',
    enum: UserRole,
    description: 'Perfil de acesso do usuário (FLEET_MANAGER para gerenciar a frota ou DRIVER para motorista)',
  })
  @IsEnum(UserRole, { message: 'Função do usuário inválida.' })
  role: UserRole;
}