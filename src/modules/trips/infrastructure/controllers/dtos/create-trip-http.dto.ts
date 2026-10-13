import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
  ValidateNested,
  Length,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationHttpDto {
  @ApiProperty({ example: 'Av. Paulista, 1000', description: 'Logradouro e número' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'São Paulo', description: 'Cidade' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP', description: 'Sigla da Unidade Federativa (UF)', minLength: 2, maxLength: 2 })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  state: string;

  @ApiPropertyOptional({ example: -23.561684, description: 'Latitude geográfica do local' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.655981, description: 'Longitude geográfica do local' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateTripHttpDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID do motorista designado para a viagem',
  })
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({
    example: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
    description: 'UUID do veículo que será utilizado',
  })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({
    type: () => LocationHttpDto,
    description: 'Local de origem da viagem',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationHttpDto)
  origin: LocationHttpDto;

  @ApiProperty({
    type: () => LocationHttpDto,
    description: 'Local de destino da viagem',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationHttpDto)
  destination: LocationHttpDto;

  @ApiPropertyOptional({
    example: '2026-09-10T14:30:00.000Z',
    description: 'Data e hora prevista para início da viagem',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-10T18:30:00.000Z',
    description: 'Data e hora prevista para chegada',
  })
  @IsOptional()
  @IsDateString()
  estimatedArrivalDate?: string;

  @ApiPropertyOptional({
    example: 'Entrega de materiais',
    description: 'Observações sobre a viagem',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: () => [TripWaypointHttpDto],
    description: 'Pontos de parada e itinerário planejado da viagem',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TripWaypointHttpDto)
  waypoints?: TripWaypointHttpDto[];
}

export class TripWaypointHttpDto {
  @ApiPropertyOptional({ example: 1, description: 'Ordem sequencial da parada' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ example: 'FUEL', enum: ['FUEL', 'REST', 'STOP'], description: 'Tipo do ponto de parada' })
  @IsString()
  @IsNotEmpty()
  type: 'FUEL' | 'REST' | 'STOP';

  @ApiProperty({ example: 'Posto Graal - Abastecimento', description: 'Título / Identificação do local' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Rodovia Régis Bittencourt, Km 299', description: 'Endereço / Logradouro' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Paragominas', description: 'Cidade' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'PA', description: 'Estado (UF)' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: -2.9986, description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -47.3536, description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Abastecer 150 litros de Diesel S10', description: 'Instruções para o motorista' })
  @IsOptional()
  @IsString()
  notes?: string;
}