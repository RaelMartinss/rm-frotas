import { IsOptional, IsString, IsUUID, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface StartImpersonationInput {
  superAdminUserId: string;
  targetClientId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ImpersonationSessionSummary {
  id: string;
  targetClientId: string;
  targetClientName: string;
  targetClientDocument: string;
  startedAt: string;
  expiresAt: string;
  scope: 'READ_ONLY';
  remainingSeconds: number;
}

export interface StartImpersonationOutput {
  accessToken: string;
  session: ImpersonationSessionSummary;
}

export interface EndImpersonationInput {
  superAdminUserId: string;
  impersonationSessionId?: string | null;
  reason?: string;
}

export interface ActiveImpersonationOutput {
  active: boolean;
  session?: ImpersonationSessionSummary | null;
}

export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ação (ex: IMPERSONATION_START, VEHICLE_VIEW)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Data inicial ISO' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Data final ISO' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Página atual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
