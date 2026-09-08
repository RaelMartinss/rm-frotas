import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartDriverTripDto {
  @ApiProperty({ description: 'ID da viagem' })
  @IsString()
  @IsNotEmpty({ message: 'O ID da viagem é obrigatório.' })
  tripId: string;
}

export class CompleteDriverTripDto {
  @ApiProperty({ description: 'ID da viagem' })
  @IsString()
  @IsNotEmpty({ message: 'O ID da viagem é obrigatório.' })
  tripId: string;

  @ApiPropertyOptional({ description: 'Quilometragem final do veículo' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'A quilometragem deve ser maior ou igual a zero.' })
  currentKm?: number;
}

export class CreateDriverFuelDto {
  @ApiProperty({ description: 'ID do veículo' })
  @IsString()
  @IsNotEmpty({ message: 'O ID do veículo é obrigatório.' })
  vehicleId: string;

  @ApiProperty({ description: 'Quilometragem no odômetro' })
  @IsNumber()
  @Min(0)
  currentKm: number;

  @ApiProperty({ description: 'Litros abastecidos' })
  @IsNumber()
  @Min(0.01)
  liters: number;

  @ApiProperty({ description: 'Preço por litro' })
  @IsNumber()
  @Min(0.01)
  pricePerLiter: number;

  @ApiProperty({ description: 'Tipo de combustível (DIESEL, GASOLINA, ETANOL, GNV)' })
  @IsString()
  @IsNotEmpty()
  fuelType: string;

  @ApiPropertyOptional({ description: 'Data do abastecimento (ISO)' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class ReportIncidentDto {
  @ApiPropertyOptional({ description: 'ID da viagem relacionada' })
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional({ description: 'ID do veículo' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ description: 'Categoria do incidente (PNEU, MECANICA, ELETRICA, ACIDENTE, ATRASO, OUTRO)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Descrição da ocorrência' })
  @IsString()
  @IsNotEmpty({ message: 'A descrição da ocorrência é obrigatória.' })
  description: string;
}
