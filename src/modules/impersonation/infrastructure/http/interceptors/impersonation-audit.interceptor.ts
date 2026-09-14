import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { UserPayload } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { IAuditLogsRepository } from '../../../domain/repositories/audit-logs.repository.interface';
import { AuditLog } from '../../../domain/entities/audit-log.entity';

@Injectable()
export class ImpersonationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ImpersonationAuditInterceptor.name);

  constructor(private readonly auditLogsRepository: IAuditLogsRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (!user || !user.impersonating) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          this.logImpersonationAction(request, user).catch((err) => {
            this.logger.error(`Falha ao registrar AuditLog durante suporte: ${err.message}`, err.stack);
          });
        },
      }),
    );
  }

  private async logImpersonationAction(request: any, user: UserPayload): Promise<void> {
    const url: string = request.url || '';
    const method: string = request.method?.toUpperCase() || 'GET';
    const params = request.params || {};
    const query = request.query || {};

    // Ignora rotas de suporte internas como /support/impersonate/active ou logs de auditoria
    if (url.includes('/support/impersonate') || url.includes('/support/audit-log')) {
      return;
    }

    const { resourceType, action } = this.deriveResourceAndAction(url, method, params);

    const log = AuditLog.create({
      impersonationSessionId: user.impersonationSessionId ?? null,
      actorUserId: user.userId,
      action,
      resourceType,
      resourceId: params.id || params.vehicleId || params.driverId || params.tripId || null,
      metadata: {
        path: url.split('?')[0],
        method,
        query: Object.keys(query).length > 0 ? query : undefined,
        targetClientId: user.targetClientId,
      },
    });

    await this.auditLogsRepository.save(log);
  }

  private deriveResourceAndAction(
    url: string,
    method: string,
    params: any,
  ): { resourceType: string; action: string } {
    const hasId = !!params.id;

    if (url.includes('/vehicles')) {
      return {
        resourceType: 'Vehicle',
        action: hasId ? 'VEHICLE_VIEW' : 'VEHICLE_LIST',
      };
    }
    if (url.includes('/drivers')) {
      return {
        resourceType: 'Driver',
        action: hasId ? 'DRIVER_VIEW' : 'DRIVER_LIST',
      };
    }
    if (url.includes('/trips')) {
      return {
        resourceType: 'Trip',
        action: hasId ? 'TRIP_VIEW' : 'TRIP_LIST',
      };
    }
    if (url.includes('/maintenances')) {
      return {
        resourceType: 'Maintenance',
        action: hasId ? 'MAINTENANCE_VIEW' : 'MAINTENANCE_LIST',
      };
    }
    if (url.includes('/fuel-records')) {
      return {
        resourceType: 'FuelRecord',
        action: hasId ? 'FUEL_VIEW' : 'FUEL_LIST',
      };
    }
    if (url.includes('/odometer')) {
      return {
        resourceType: 'Odometer',
        action: 'ODOMETER_VIEW',
      };
    }
    if (url.includes('/dashboard')) {
      return {
        resourceType: 'Dashboard',
        action: 'DASHBOARD_VIEW',
      };
    }
    if (url.includes('/incidents')) {
      return {
        resourceType: 'Incident',
        action: hasId ? 'INCIDENT_VIEW' : 'INCIDENT_LIST',
      };
    }

    return {
      resourceType: 'Unknown',
      action: `${method}_REQUEST`,
    };
  }
}
