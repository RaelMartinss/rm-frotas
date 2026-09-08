import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsEmail, IsOptional } from 'class-validator';
import type { CnhCategory } from '../../../domain/value-objects/cnh.vo';

export class CreateDriverHttpDto {
  @ApiProperty({ example: 'Rael Martins', description: 'Nome completo do motorista' })
  @IsString()
  @IsNotEmpty({ message: 'O nome do motorista é obrigatório.' })
  name: string;

  @ApiProperty({ example: 'motorista@empresa.com', description: 'E-mail de acesso do motorista ao aplicativo' })
  @IsEmail({}, { message: 'Insira um e-mail válido para o motorista.' })
  @IsNotEmpty({ message: 'O e-mail de acesso é obrigatório.' })
  email: string;

  @ApiProperty({ example: '529.982.247-25', description: 'CPF válido (com ou sem formatação)' })
  @IsString()
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  cpf: string;

  @ApiPropertyOptional({ example: '(11) 99999-8888', description: 'Telefone ou celular do motorista' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '12345678901', description: 'Número do registro da CNH (11 dígitos)' })
  @IsString()
  @IsNotEmpty({ message: 'O número da CNH é obrigatório.' })
  cnhNumber: string;

  @ApiProperty({
    example: 'D',
    description: 'Categoria da habilitação',
    enum: ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'],
  })
  @IsString()
  @IsNotEmpty({ message: 'A categoria da CNH é obrigatória.' })
  cnhCategory: CnhCategory;

  @ApiProperty({ example: '2030-12-31', description: 'Data de validade da CNH (formato ISO YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Data de validade da CNH inválida.' })
  @IsNotEmpty({ message: 'A data de validade da CNH é obrigatória.' })
  cnhExpirationDate: string;
}