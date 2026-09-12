import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { OdometerSource } from '../../../domain/value-objects/odometer-source.vo';

export class RegisterOdometerReadingHttpDto {
  @ApiProperty({ description: 'ID do veículo', example: 'd3b07384-d113-4ec6-8968-072049d52033' })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ description: 'Quilometragem lida (deve ser >= 0)', example: 65420 })
  @IsInt()
  @Min(0)
  currentKm: number;

  @ApiProperty({ enum: OdometerSource, description: 'Origem da leitura', example: OdometerSource.MANUAL })
  @IsEnum(OdometerSource)
  source: OdometerSource;

  @ApiProperty({ description: 'ID da entidade de origem (viagem, abastecimento, etc.)', example: 'source-123' })
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiPropertyOptional({ description: 'Data da leitura (ISO 8601)', example: '2026-09-12T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class CorrectOdometerReadingHttpDto {
  @ApiProperty({ description: 'ID do veículo', example: 'd3b07384-d113-4ec6-8968-072049d52033' })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ description: 'Quilometragem correta corrigida', example: 65000 })
  @IsInt()
  @Min(0)
  currentKm: number;

  @ApiProperty({ description: 'Motivo / justificativa da correção manual', example: 'Erro de digitação do motorista' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Data da leitura (ISO 8601)', example: '2026-09-12T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class OdometerHistoryQueryHttpDto {
  @ApiPropertyOptional({ description: 'Número da página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Quantidade de registros por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OdometerSource, description: 'Filtrar por fonte' })
  @IsOptional()
  @IsEnum(OdometerSource)
  source?: OdometerSource;

  @ApiPropertyOptional({ description: 'Data inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
