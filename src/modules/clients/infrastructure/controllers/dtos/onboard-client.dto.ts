import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class ClientAddressDto {
  @ApiPropertyOptional({ example: 'Av. Paulista' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Sala 42' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Bela Vista' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '01310-100' })
  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class OnboardClientDto {
  @ApiProperty({ example: 'Transportadora Silva e Filhos Ltda' })
  @IsNotEmpty({ message: 'Razão social é obrigatória' })
  @IsString()
  legalName: string;

  @ApiProperty({ example: 'Silva Express' })
  @IsNotEmpty({ message: 'Nome fantasia é obrigatório' })
  @IsString()
  tradeName: string;

  @ApiProperty({ example: '12.345.678/0001-95' })
  @IsNotEmpty({ message: 'CNPJ/CPF é obrigatório' })
  @IsString()
  document: string;

  @ApiProperty({ example: 'financeiro@silvaexpress.com.br' })
  @IsNotEmpty({ message: 'E-mail de cobrança/contato é obrigatório' })
  @IsEmail({}, { message: 'E-mail de cobrança inválido' })
  billingEmail: string;

  @ApiPropertyOptional({ type: () => ClientAddressDto })
  @IsOptional()
  @IsObject()
  address?: ClientAddressDto;

  @ApiProperty({ example: 'Roberto Silva' })
  @IsNotEmpty({ message: 'Nome do Gestor de Frota inicial é obrigatório' })
  @IsString()
  fleetManagerName: string;

  @ApiProperty({ example: 'roberto@silvaexpress.com.br' })
  @IsNotEmpty({ message: 'E-mail de login do Gestor de Frota inicial é obrigatório' })
  @IsEmail({}, { message: 'E-mail de login do Gestor inválido' })
  fleetManagerEmail: string;
}
