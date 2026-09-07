import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdateVehicleCrlvDto {
  @ApiProperty({
    example: '2027-08-20',
    description: 'Nova data de vencimento do CRLV (formato YYYY-MM-DD ou ISO)',
  })
  @IsNotEmpty({ message: 'A data de vencimento do CRLV é obrigatória.' })
  @IsDateString({}, { message: 'A data de vencimento do CRLV deve estar no formato de data válido (ex: YYYY-MM-DD).' })
  crlvExpiration: string;
}
