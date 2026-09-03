import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import type { CnhCategory } from '../../../domain/value-objects/cnh.vo';

export class CreateDriverHttpDto {
  @ApiProperty({ example: 'Rael Martins', description: 'Nome completo do motorista' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '529.982.247-25', description: 'CPF válido (com ou sem formatação)' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: '12345678901', description: 'Número do registro da CNH (11 dígitos)' })
  @IsString()
  @IsNotEmpty()
  cnhNumber: string;

  @ApiProperty({
    example: 'D',
    description: 'Categoria da habilitação',
    enum: ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'],
  })
  @IsString()
  @IsNotEmpty()
  cnhCategory: CnhCategory;

  @ApiProperty({ example: '2030-12-31', description: 'Data de validade da CNH (formato ISO YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  cnhExpirationDate: string;
}