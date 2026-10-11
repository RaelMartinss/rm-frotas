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

  @ApiPropertyOptional({ description: 'Nome ou bandeira do posto de combustível' })
  @IsOptional()
  @IsString()
  gasStation?: string;

  @ApiPropertyOptional({ description: 'Indica se completou o tanque (padrão true)' })
  @IsOptional()
  fullTank?: boolean;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'URL ou foto do comprovante' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Data do abastecimento (legado/ISO)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Data/hora exata em que o abastecimento ocorreu no veículo (ISO 8601 UTC)' })
  @IsOptional()
  @IsString()
  occurredAt?: string;
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

  @ApiPropertyOptional({ description: 'Latitude detectada pelo GPS' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude detectada pelo GPS' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Endereço aproximado ou rodovia detectada' })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ description: 'URL ou base64 da foto da avaria/dano' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Lista de fotos de evidências' })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Dados do checklist veicular vinculado' })
  @IsOptional()
  checklist?: any;

  @ApiProperty({ description: 'Categoria do incidente (PNEU, MECANICA, ELETRICA, ACIDENTE, ATRASO, OUTRO)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Descrição da ocorrência' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SaveTripChecklistDto {
  @ApiProperty({ description: 'ID da viagem' })
  @IsString()
  @IsNotEmpty({ message: 'O ID da viagem é obrigatório.' })
  tripId: string;

  @ApiProperty({ description: 'Dados do checklist veicular em formato JSON' })
  @IsNotEmpty()
  checklist: any;
}

export class UpdateDriverFuelReceiptDto {
  @ApiProperty({ description: 'Foto ou URL do comprovante fiscal (Base64 DataURL ou link)' })
  @IsString()
  @IsNotEmpty({ message: 'A foto do comprovante é obrigatória.' })
  receiptUrl: string;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Nome ou bandeira do posto' })
  @IsOptional()
  @IsString()
  gasStation?: string;
}

export class GetDriverFuelHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar apenas abastecimentos sem comprovante pendente' })
  @IsOptional()
  pendingReceiptOnly?: string;
}

export class SyncUserDeviceDto {
  @ApiProperty({ description: 'Identificador único persistente do dispositivo (UUID)' })
  @IsString()
  @IsNotEmpty({ message: 'O deviceId é obrigatório.' })
  deviceId: string;

  @ApiProperty({ description: 'Número incremental de build (ex: 20)' })
  @IsNumber()
  @Min(1, { message: 'O buildNumber deve ser maior que zero.' })
  buildNumber: number;

  @ApiProperty({ description: 'Versão legível do app (ex: 1.0.20)' })
  @IsString()
  @IsNotEmpty({ message: 'A appVersion é obrigatória.' })
  appVersion: string;

  @ApiProperty({ enum: ['ANDROID', 'IOS', 'WEB'], description: 'Plataforma do dispositivo' })
  @IsString()
  @IsNotEmpty({ message: 'A plataforma é obrigatória.' })
  platform: 'ANDROID' | 'IOS' | 'WEB';

  @ApiPropertyOptional({ description: 'Modelo do dispositivo (ex: Samsung Galaxy A54)' })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({ description: 'Versão do sistema operacional (ex: Android 14)' })
  @IsOptional()
  @IsString()
  osVersion?: string;
}
