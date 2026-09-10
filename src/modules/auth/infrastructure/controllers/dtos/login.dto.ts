import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceInfoDto {
  @ApiPropertyOptional({
    example: 'mobile',
    description: 'Plataforma de acesso (mobile ou web)',
  })
  @IsString()
  @IsOptional()
  platform?: 'mobile' | 'web';

  @ApiPropertyOptional({
    example: 'Mozilla/5.0...',
    description: 'User-Agent do cliente',
  })
  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'rael@frotas.com', description: 'E-mail cadastrado' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'senhaSegura123', description: 'Senha de acesso' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Informações do dispositivo/cliente' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}