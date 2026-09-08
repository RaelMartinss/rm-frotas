import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../../domain/entities/user.entity';

export class UpdateUserRoleDto {
  @ApiProperty({
    example: 'ADMIN',
    enum: [UserRole.ADMIN, UserRole.DRIVER],
    description: 'Novo papel atribuído ao usuário (ADMIN ou DRIVER)',
  })
  @IsNotEmpty({ message: 'O papel é obrigatório.' })
  @IsEnum([UserRole.ADMIN, UserRole.DRIVER], {
    message: 'Papel inválido. Apenas ADMIN ou DRIVER podem ser atribuídos.',
  })
  role: UserRole;
}
