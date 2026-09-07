import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceType } from '../../../domain/enums/maintenance-type.enum';
import { MaintenanceStatus } from '../../../domain/enums/maintenance-status.enum';

export class MaintenanceItemDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da peça ou serviço é obrigatório.' })
  name: string;

  @IsNumber({}, { message: 'O valor da peça ou serviço deve ser numérico.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  cost: number;

  @IsOptional()
  @IsNumber({}, { message: 'A quantidade deve ser numérica.' })
  @Min(1, { message: 'A quantidade mínima é 1.' })
  quantity?: number;
}

export class CreateMaintenanceDto {
  @IsUUID('4', { message: 'O vehicleId deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do veículo é obrigatório.' })
  vehicleId: string;

  @IsOptional()
  @IsEnum(MaintenanceType, { message: 'Tipo inválido. Opções: PREVENTIVA, CORRETIVA.' })
  type?: MaintenanceType;

  @IsString()
  @IsNotEmpty({ message: 'A descrição da manutenção é obrigatória.' })
  description: string;

  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @IsOptional()
  @IsDateString({}, { message: 'A data prevista deve ser uma data válida.' })
  scheduledDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceItemDto)
  items?: MaintenanceItemDto[];
}

export class StartMaintenanceDto {
  @IsOptional()
  @IsUUID('4', { message: 'O vehicleId deve ser um UUID válido.' })
  vehicleId?: string;

  @IsOptional()
  @IsEnum(MaintenanceType, { message: 'Tipo inválido. Opções: PREVENTIVA, CORRETIVA.' })
  type?: MaintenanceType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @IsOptional()
  @IsDateString({}, { message: 'A data de início deve ser uma data válida.' })
  startedAt?: string;
}

export class FinishMaintenanceDto {
  @IsNumber({}, { message: 'O odômetro no momento da finalização é obrigatório.' })
  @Min(0, { message: 'O odômetro não pode ser negativo.' })
  odometerAtService: number;

  @IsOptional()
  @IsDateString({}, { message: 'A data de término deve ser uma data válida.' })
  finishedAt?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O custo deve ser um número.' })
  @Min(0, { message: 'O custo não pode ser negativo.' })
  cost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceItemDto)
  items?: MaintenanceItemDto[];
}

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MaintenanceType, { message: 'Tipo inválido. Opções: PREVENTIVA, CORRETIVA.' })
  type?: MaintenanceType;

  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @IsOptional()
  @IsDateString({}, { message: 'A data prevista deve ser uma data válida.' })
  scheduledDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O custo deve ser um número.' })
  @Min(0, { message: 'O custo não pode ser negativo.' })
  cost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceItemDto)
  items?: MaintenanceItemDto[];
}

export class CancelMaintenanceDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListMaintenancesQueryDto {
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenanceType)
  type?: MaintenanceType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
