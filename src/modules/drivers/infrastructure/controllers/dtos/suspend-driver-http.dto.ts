import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { SuspensionReasonCategory } from '../../../domain/entities/suspension-reason-category.enum';

export class SuspendDriverHttpDto {
  @ApiProperty({
    enum: SuspensionReasonCategory,
    example: SuspensionReasonCategory.CNH_VENCIDA,
    description: 'Categoria do motivo da suspensão',
  })
  @IsEnum(SuspensionReasonCategory, {
    message: 'Categoria de motivo de suspensão inválida.',
  })
  @IsNotEmpty({ message: 'A categoria do motivo é obrigatória.' })
  reasonCategory: SuspensionReasonCategory;

  @ApiPropertyOptional({
    description:
      'Detalhes adicionais da justificativa (obrigatório se category for OUTRO)',
    example: 'Aguardando regularização de processo no DETRAN.',
  })
  @IsOptional()
  @IsString({ message: 'Os detalhes da justificativa devem ser texto.' })
  reasonDetails?: string;

  @ApiPropertyOptional({
    description:
      'Data prevista de retorno (obrigatória se indefinite for falso)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'A data prevista de retorno deve estar no formato ISO (YYYY-MM-DD).' },
  )
  expectedReturnDate?: string;

  @ApiPropertyOptional({
    description: 'Indica se a suspensão é por prazo indeterminado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo de prazo indeterminado deve ser booleano.' })
  indefinite?: boolean;

  @ApiPropertyOptional({
    description: 'URL de anexo comprobatório ou evidência',
    example: 'https://storage.exemplo.com/docs/suspensao-cnh.pdf',
  })
  @IsOptional()
  @IsString({ message: 'A URL do anexo deve ser uma string.' })
  attachmentUrl?: string;
}
