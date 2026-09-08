import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';
import { ClientAddressDto } from './onboard-client.dto';

export class UpdateClientDto {
  @ApiPropertyOptional({ example: 'Transportadora Silva e Filhos Ltda' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: 'Silva Express Atualizada' })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional({ example: 'contato@silvaexpress.com.br' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail de cobrança inválido' })
  billingEmail?: string;

  @ApiPropertyOptional({ type: () => ClientAddressDto })
  @IsOptional()
  @IsObject()
  address?: ClientAddressDto;
}
