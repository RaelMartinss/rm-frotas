import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class UpdateVehicleKmDto {
  @ApiProperty({ example: 25000, description: 'Nova quilometragem acumulada do veículo (deve ser maior ou igual à atual)' })
  @IsInt({ message: 'A quilometragem deve ser um número inteiro.' })
  @IsPositive({ message: 'A quilometragem deve ser um valor positivo.' })
  @IsNotEmpty({ message: 'A quilometragem é obrigatória.' })
  currentKm: number;
}