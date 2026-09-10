import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPasswordDto {
  @ApiProperty({ example: 'senhaSegura123', description: 'Senha atual para confirmação de identidade' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
