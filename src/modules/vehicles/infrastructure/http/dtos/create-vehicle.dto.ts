import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleDto {
    @ApiProperty({ example: 'ABC-1234', description: 'Placa do veículos no padrão tradicional ou mercosul'})
    @IsString()
    @IsNotEmpty()
    plate: string;

    @ApiPropertyOptional({ example: 'Volvo', description: 'Marca do veículo' })
    @IsOptional()
    @IsString()
    brand?: string;


    @ApiProperty({ example: 'Volvo FH 540', description: 'Modelo do veículo' })
    @IsString()
    @IsNotEmpty()
    model: string;

    @ApiProperty({ example: 2023, description: 'Ano de fabricação' })
    @IsNumber()
    @Min(1900)
    year: number;

    @ApiProperty({ example: 15000, description: 'Quilometragem atual' })
    @IsNumber()
    @Min(0)
    currentKm: number;

    @ApiPropertyOptional({ example: '2026-12-31', description: 'Data de vencimento do CRLV (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    crlvExpiration?: string;
}