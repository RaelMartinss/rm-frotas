import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LiftSuspensionHttpDto {
  @ApiPropertyOptional({
    description: 'Motivo/justificativa do encerramento da suspensão e reativação',
    example: 'CNH renovada e apresentada com comprovante válido.',
  })
  @IsOptional()
  @IsString({ message: 'O motivo de encerramento deve ser uma string.' })
  liftReason?: string;
}
