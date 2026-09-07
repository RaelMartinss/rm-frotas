import { ApiProperty } from '@nestjs/swagger';

export class CsvRowErrorDto {
  @ApiProperty({ example: 3, description: 'Número da linha no arquivo CSV (1-indexed, linha 1 é o cabeçalho)' })
  linha: number;

  @ApiProperty({ example: 'ABC1234', description: 'Placa informada na linha (se houver)', required: false })
  placa?: string;

  @ApiProperty({ example: 'Placa já cadastrada no sistema', description: 'Motivo da rejeição da linha' })
  motivo: string;
}

export class ImportVehiclesResultDto {
  @ApiProperty({ example: 100, description: 'Total de linhas de dados processadas no arquivo CSV' })
  totalLinhas: number;

  @ApiProperty({ example: 98, description: 'Quantidade de veículos importados com sucesso' })
  importadosComSucesso: number;

  @ApiProperty({ type: [CsvRowErrorDto], description: 'Lista detalhada de linhas que falharam com seus respectivos motivos' })
  erros: CsvRowErrorDto[];
}
