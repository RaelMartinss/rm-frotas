import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { RequestContextService } from './request-context.service';

export interface DomainLogMeta {
  reason?: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  maintenanceId?: string;
  fuelRecordId?: string;
  clientId?: string;
  userId?: string;
  [key: string]: any;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
]);

function sanitizeMeta(meta?: DomainLogMeta): Record<string, any> {
  if (!meta) return {};
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

@Injectable()
export class DomainLoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly requestContextService: RequestContextService,
  ) {
    this.logger.setContext('DomainEvent');
  }

  /**
   * Loga um erro de negócio ou falha de regra de domínio.
   * Exemplo: domainLogger.error('trip.start.failed', { tripId, vehicleId, reason: 'VEHICLE_ALREADY_IN_USE' })
   */
  error(event: string, meta?: DomainLogMeta, message?: string): void {
    const ctx = this.requestContextService.get();
    const payload = {
      event,
      requestId: ctx?.requestId,
      userId: meta?.userId ?? ctx?.userId,
      clientId: meta?.clientId ?? ctx?.clientId,
      ...sanitizeMeta(meta),
    };
    this.logger.error(payload, message || `[${event}] ${meta?.reason || ''}`.trim());
  }

  /**
   * Loga um aviso ou bloqueio preventivo de domínio.
   */
  warn(event: string, meta?: DomainLogMeta, message?: string): void {
    const ctx = this.requestContextService.get();
    const payload = {
      event,
      requestId: ctx?.requestId,
      userId: meta?.userId ?? ctx?.userId,
      clientId: meta?.clientId ?? ctx?.clientId,
      ...sanitizeMeta(meta),
    };
    this.logger.warn(payload, message || `[${event}] ${meta?.reason || ''}`.trim());
  }

  /**
   * Loga um evento de negócio relevante concluído.
   */
  info(event: string, meta?: DomainLogMeta, message?: string): void {
    const ctx = this.requestContextService.get();
    const payload = {
      event,
      requestId: ctx?.requestId,
      userId: meta?.userId ?? ctx?.userId,
      clientId: meta?.clientId ?? ctx?.clientId,
      ...sanitizeMeta(meta),
    };
    this.logger.info(payload, message || `[${event}]`.trim());
  }
}
