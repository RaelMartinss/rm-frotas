import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';

export class UpdateDriverHttpDto {
  @ApiPropertyOptional({ example: 'Emanuela Morais' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'emanuelamorais@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '(16) 99123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '02145632879' })
  @IsOptional()
  @IsString()
  cnhNumber?: string;

  @ApiPropertyOptional({ example: 'AB' })
  @IsOptional()
  @IsString()
  cnhCategory?: any;

  @ApiPropertyOptional({ example: '2028-03-19' })
  @IsOptional()
  cnhExpirationDate?: string | Date;

  @ApiPropertyOptional({ enum: DriverStatus, example: DriverStatus.ACTIVE })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}
