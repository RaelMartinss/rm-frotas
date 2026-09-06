import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleStatus } from '../../../domain/entities/vehicle.entity';

export class GetVehiclesQueryDto {
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

  @ApiPropertyOptional({ description: 'Termo para busca por placa, modelo ou marca' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: VehicleStatus, description: 'Filtrar por status' })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
