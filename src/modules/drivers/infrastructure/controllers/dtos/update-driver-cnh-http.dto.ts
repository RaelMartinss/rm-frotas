import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import type { CnhCategory } from '../../../domain/value-objects/cnh.vo';

export class UpdateDriverCnhHttpDto {
  @ApiProperty({ example: '98765432100', description: 'Novo número de registro da CNH' })
  @IsString()
  @IsNotEmpty()
  cnhNumber: string;

  @ApiProperty({
    example: 'E',
    description: 'Nova categoria da CNH',
    enum: ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'],
  })
  @IsString()
  @IsNotEmpty()
  cnhCategory: CnhCategory;

  @ApiProperty({ example: '2032-12-31', description: 'Nova data de validade da CNH (formato ISO YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  cnhExpirationDate: string;
}