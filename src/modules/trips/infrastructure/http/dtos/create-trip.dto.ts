import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class LocationDto {
  @ApiProperty({ example: 'Rua A, 100' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Paragominas' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'PA' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ example: -2.9982 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -47.3522 })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class CreateTripDto {
  @ApiProperty({ example: 'uuid-do-motorista' })
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({ example: 'uuid-do-veiculo' })
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;
}