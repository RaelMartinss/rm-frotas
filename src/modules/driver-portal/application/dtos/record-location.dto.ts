import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordLocationDto {
  @ApiProperty({ description: 'Latitude decimal' })
  @IsNumber({}, { message: 'Latitude deve ser um número válido.' })
  latitude: number;

  @ApiProperty({ description: 'Longitude decimal' })
  @IsNumber({}, { message: 'Longitude deve ser um número válido.' })
  longitude: number;

  @ApiPropertyOptional({ description: 'Timestamp em que a localização foi registrada no dispositivo (ISO string)' })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}

export class RecordLocationBatchDto {
  @ApiPropertyOptional({ description: 'Latitude decimal (se envio unitário)' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude decimal (se envio unitário)' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Timestamp (se envio unitário)' })
  @IsOptional()
  @IsString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Lista de pings de localização (se envio em lote)', type: [RecordLocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordLocationDto)
  pings?: RecordLocationDto[];
}
