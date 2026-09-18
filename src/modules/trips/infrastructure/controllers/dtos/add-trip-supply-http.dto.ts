import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { FuelType } from '../../../../fuel/domain/enums/fuel-type.enum';

export class AddTripSupplyHttpDto {
  @ApiPropertyOptional({ description: 'UUID da viagem (opcional, normalmente fornecido na rota)', example: '41addd41-3b10-4765-bafd-c0da9e0dcdcb' })
  @IsString({ message: 'tripId deve ser um texto.' })
  @IsOptional()
  tripId?: string;

  @ApiProperty({ description: 'Quantidade de litros abastecidos', example: 50.0 })
  @IsNumber({}, { message: 'Litros deve ser um número.' })
  @IsPositive({ message: 'A quantidade de litros deve ser maior que zero.' })
  @IsNotEmpty({ message: 'A quantidade de litros é obrigatória.' })
  liters: number;

  @ApiPropertyOptional({ description: 'Valor total pago pelo abastecimento (R$)', example: 250.0 })
  @IsNumber({}, { message: 'Valor total deve ser um número.' })
  @IsPositive({ message: 'O valor total deve ser maior que zero.' })
  @IsOptional()
  totalValue?: number;

  @ApiPropertyOptional({ description: 'Custo total (alternativa a totalValue)', example: 250.0 })
  @IsNumber({}, { message: 'Custo total deve ser um número.' })
  @IsPositive({ message: 'O custo total deve ser maior que zero.' })
  @IsOptional()
  totalCost?: number;

  @ApiPropertyOptional({ description: 'Preço unitário por litro (R$)', example: 5.0 })
  @IsNumber({}, { message: 'Preço por litro deve ser um número.' })
  @Min(0, { message: 'Preço por litro não pode ser negativo.' })
  @IsOptional()
  pricePerUnit?: number;

  @ApiProperty({ description: 'Tipo de combustível utilizado', enum: FuelType, example: FuelType.DIESEL })
  @IsEnum(FuelType, { message: 'Tipo de combustível inválido.' })
  @IsNotEmpty({ message: 'O tipo de combustível é obrigatório.' })
  fuelType: FuelType;

  @ApiPropertyOptional({ description: 'Quilometragem no momento do abastecimento', example: 120500 })
  @IsNumber({}, { message: 'Odômetro deve ser um número.' })
  @Min(0, { message: 'Odômetro não pode ser negativo.' })
  @IsOptional()
  odometer?: number;

  @ApiPropertyOptional({ description: 'Odômetro no momento do abastecimento (alternativa a odometer)', example: 120500 })
  @IsNumber({}, { message: 'Odômetro deve ser um número.' })
  @Min(0, { message: 'Odômetro não pode ser negativo.' })
  @IsOptional()
  odometerAtFueling?: number;

  @ApiPropertyOptional({ description: 'Data do abastecimento (YYYY-MM-DD)', example: '2026-09-18' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Data do abastecimento ISO', example: '2026-09-18T10:00:00.000Z' })
  @IsOptional()
  fueledAt?: string;

  @ApiPropertyOptional({ description: 'Nome ou bandeira do posto de combustível', example: 'Posto Shell' })
  @IsString({ message: 'Nome do posto deve ser um texto.' })
  @IsOptional()
  gasStation?: string;

  @ApiPropertyOptional({ description: 'Indica se o tanque foi abastecido até o limite (tanque cheio)', default: true })
  @IsBoolean({ message: 'Tanque cheio deve ser verdadeiro ou falso.' })
  @IsOptional()
  fullTank?: boolean;

  @ApiPropertyOptional({ description: 'URL ou comprovante do abastecimento em base64' })
  @IsString({ message: 'URL do comprovante deve ser um texto.' })
  @IsOptional()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsString({ message: 'Observações devem ser um texto.' })
  @IsOptional()
  notes?: string;
}
