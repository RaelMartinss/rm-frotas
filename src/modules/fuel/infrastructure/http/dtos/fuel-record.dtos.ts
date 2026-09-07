import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelType } from '../../../domain/enums/fuel-type.enum';

export class CreateFuelRecordDto {
  @ApiProperty({ description: 'ID do veículo abastecido', example: 'uuid-do-veiculo' })
  @IsUUID('4', { message: 'ID do veículo inválido.' })
  @IsNotEmpty({ message: 'O veículo é obrigatório.' })
  vehicleId: string;

  @ApiPropertyOptional({
    description: 'ID do motorista responsável (obrigatório se gestor, automático se motorista)',
    example: 'uuid-do-motorista',
  })
  @IsUUID('4', { message: 'ID do motorista inválido.' })
  @IsOptional()
  driverId?: string;

  @ApiProperty({ description: 'Tipo de combustível utilizado', enum: FuelType, example: FuelType.GASOLINA })
  @IsEnum(FuelType, { message: 'Tipo de combustível inválido.' })
  @IsNotEmpty({ message: 'O tipo de combustível é obrigatório.' })
  fuelType: FuelType;

  @ApiProperty({ description: 'Quantidade de litros abastecidos', example: 45.5 })
  @IsNumber({}, { message: 'Litros deve ser um valor numérico.' })
  @IsPositive({ message: 'A quantidade de litros deve ser maior que zero.' })
  liters: number;

  @ApiPropertyOptional({ description: 'Preço unitário por litro (R$)', example: 5.89 })
  @IsNumber({}, { message: 'Preço por litro deve ser um valor numérico.' })
  @Min(0, { message: 'Preço por litro não pode ser negativo.' })
  @IsOptional()
  pricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Valor total pago pelo abastecimento (R$)', example: 267.99 })
  @IsNumber({}, { message: 'Valor total deve ser um número.' })
  @IsPositive({ message: 'O valor total deve ser maior que zero.' })
  @IsOptional()
  totalCost?: number;

  @ApiProperty({ description: 'Quilometragem no momento do abastecimento', example: 45200 })
  @IsNumber({}, { message: 'Odômetro deve ser um número.' })
  @Min(0, { message: 'Odômetro não pode ser negativo.' })
  odometerAtFueling: number;

  @ApiPropertyOptional({ description: 'Nome ou bandeira do posto de combustível', example: 'Posto Ipiranga Centro' })
  @IsString({ message: 'Nome do posto deve ser um texto.' })
  @IsOptional()
  gasStation?: string;

  @ApiPropertyOptional({ description: 'Indica se o tanque foi abastecido até o limite (tanque cheio)', default: true })
  @IsBoolean({ message: 'Tanque cheio deve ser verdadeiro ou falso.' })
  @IsOptional()
  fullTank?: boolean;

  @ApiPropertyOptional({ description: 'URL ou comprovante do abastecimento', example: 'https://cdn.exemplo.com/recibo.jpg' })
  @IsString({ message: 'URL do comprovante deve ser um texto.' })
  @IsOptional()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Data/hora em que o abastecimento ocorreu', example: '2026-09-07T14:30:00Z' })
  @IsOptional()
  fueledAt?: string;

  @ApiPropertyOptional({ description: 'Observações adicionais', example: 'Abastecido com aditivo' })
  @IsString({ message: 'Observação deve ser um texto.' })
  @IsOptional()
  notes?: string;
}

export class UpdateFuelRecordDto {
  @ApiPropertyOptional({ description: 'Tipo de combustível utilizado', enum: FuelType })
  @IsEnum(FuelType, { message: 'Tipo de combustível inválido.' })
  @IsOptional()
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'Quantidade de litros abastecidos' })
  @IsNumber({}, { message: 'Litros deve ser um valor numérico.' })
  @IsPositive({ message: 'A quantidade de litros deve ser maior que zero.' })
  @IsOptional()
  liters?: number;

  @ApiPropertyOptional({ description: 'Preço unitário por litro (R$)' })
  @IsNumber({}, { message: 'Preço por litro deve ser um valor numérico.' })
  @Min(0, { message: 'Preço por litro não pode ser negativo.' })
  @IsOptional()
  pricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Valor total pago pelo abastecimento (R$)' })
  @IsNumber({}, { message: 'Valor total deve ser um número.' })
  @IsPositive({ message: 'O valor total deve ser maior que zero.' })
  @IsOptional()
  totalCost?: number;

  @ApiPropertyOptional({ description: 'Nome ou bandeira do posto de combustível' })
  @IsString({ message: 'Nome do posto deve ser um texto.' })
  @IsOptional()
  gasStation?: string;

  @ApiPropertyOptional({ description: 'Indica se o tanque foi abastecido até o limite' })
  @IsBoolean({ message: 'Tanque cheio deve ser verdadeiro ou falso.' })
  @IsOptional()
  fullTank?: boolean;

  @ApiPropertyOptional({ description: 'URL ou comprovante do abastecimento' })
  @IsString({ message: 'URL do comprovante deve ser um texto.' })
  @IsOptional()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Data/hora em que o abastecimento ocorreu' })
  @IsOptional()
  fueledAt?: string;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsString({ message: 'Observação deve ser um texto.' })
  @IsOptional()
  notes?: string;
}

export class ListFuelRecordsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por veículo (UUID)' })
  @IsUUID('4')
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por motorista (UUID)' })
  @IsUUID('4')
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de combustível', enum: FuelType })
  @IsEnum(FuelType)
  @IsOptional()
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'Filtrar apenas por abastecimentos tanque cheio' })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  fullTank?: boolean;

  @ApiPropertyOptional({ description: 'Data inicial (ISO string)' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO string)' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Termo de busca geral (placa, modelo, motorista, posto)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Número da página', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Quantidade de itens por página', default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}

export class GetConsumptionReportQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar relatório para um veículo específico (UUID)' })
  @IsUUID('4')
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Data inicial para o período' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final para o período' })
  @IsOptional()
  endDate?: string;
}

export class GetCostStatsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar estatísticas por veículo (UUID)' })
  @IsUUID('4')
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtrar estatísticas por motorista (UUID)' })
  @IsUUID('4')
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Data inicial' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final' })
  @IsOptional()
  endDate?: string;
}
