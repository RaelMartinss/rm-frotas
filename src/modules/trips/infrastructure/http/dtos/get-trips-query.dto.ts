import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../../../domain/entities/trip-status.enum';

export class GetTripsQueryDto {
  @ApiPropertyOptional({ enum: TripStatus })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;

  @ApiPropertyOptional({ description: 'Termo de busca por motorista, placa/modelo do veículo, origem ou destino' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}