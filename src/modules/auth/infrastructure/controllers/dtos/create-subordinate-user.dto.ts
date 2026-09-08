import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../domain/entities/user.entity';

export class CreateSubordinateUserDto {
  @ApiProperty({ example: 'João Assistente', description: 'Nome completo do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  name: string;

  @ApiProperty({ example: 'joao.assistente@empresa.com', description: 'E-mail corporativo do usuário' })
  @IsEmail({}, { message: 'Insira um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email: string;

  @ApiProperty({
    example: 'ADMIN',
    enum: [UserRole.FLEET_MANAGER, UserRole.ADMIN],
    description: 'Papel do usuário administrativo na equipe (FLEET_MANAGER ou ADMIN)',
  })
  @IsEnum([UserRole.FLEET_MANAGER, UserRole.ADMIN], {
    message: 'Papel inválido. Apenas papéis administrativos (ADMIN ou FLEET_MANAGER) podem ser criados aqui. Motoristas devem ser cadastrados no menu Motoristas.',
  })
  role: UserRole;
}
