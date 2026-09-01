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

export class LocationHttpDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  state: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateTripHttpDto {
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationHttpDto)
  origin: LocationHttpDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationHttpDto)
  destination: LocationHttpDto;
}