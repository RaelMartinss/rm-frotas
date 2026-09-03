import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
  ValidateNested,
  Length,
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
}