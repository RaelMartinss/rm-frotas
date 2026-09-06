import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';

export class GetDriversQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Número da página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Quantidade de registros por página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Termo para busca por nome, CPF ou CNH' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: DriverStatus, description: 'Filtrar por status' })
  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;
}
