import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class UpdateVehicleKmDto {
  @IsInt({ message: 'A quilometragem deve ser um número inteiro.' })
  @IsPositive({ message: 'A quilometragem deve ser um valor positivo.' })
  @IsNotEmpty({ message: 'A quilometragem é obrigatória.' })
  currentKm: number;
}