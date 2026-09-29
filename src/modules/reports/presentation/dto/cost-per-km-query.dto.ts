import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum CostPerKmSortOption {
  CPK_DESC = 'cpk_desc',
  CPK_ASC = 'cpk_asc',
  PLATE = 'plate',
}

export class CostPerKmQueryDto {
  @ApiProperty({ description: 'Data inicial no formato YYYY-MM-DD', example: '2026-09-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Data final no formato YYYY-MM-DD', example: '2026-09-28' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ description: 'ID do veículo específico (opcional)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Número da página (padrão: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página (máximo: 50, padrão: 20)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: 'Ordenação das linhas',
    enum: CostPerKmSortOption,
    default: CostPerKmSortOption.CPK_DESC,
  })
  @IsOptional()
  @IsEnum(CostPerKmSortOption)
  sort: CostPerKmSortOption = CostPerKmSortOption.CPK_DESC;
}

export class ExportCostPerKmQueryDto {
  @ApiProperty({ description: 'Data inicial no formato YYYY-MM-DD', example: '2026-09-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Data final no formato YYYY-MM-DD', example: '2026-09-28' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ description: 'ID do veículo específico (opcional)' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'Ordenação das linhas',
    enum: CostPerKmSortOption,
    default: CostPerKmSortOption.CPK_DESC,
  })
  @IsOptional()
  @IsEnum(CostPerKmSortOption)
  sort: CostPerKmSortOption = CostPerKmSortOption.CPK_DESC;

  @ApiPropertyOptional({
    description: 'Formato do arquivo exportado',
    enum: ['csv', 'pdf'],
    default: 'csv',
  })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format: string = 'csv';
}
