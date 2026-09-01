import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import type{ CnhCategory } from '../../../domain/value-objects/cnh.vo';

export class CreateDriverHttpDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsNotEmpty()
  cnhNumber: string;

  @IsString()
  @IsNotEmpty()
  cnhCategory: CnhCategory;

  @IsDateString()
  @IsNotEmpty()
  cnhExpirationDate: string;
}