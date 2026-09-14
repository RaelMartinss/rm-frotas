import { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogWithDetails {
  log: AuditLog;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  impersonationSession?: {
    id: string;
    targetClientId: string;
    targetClientName?: string;
  } | null;
}

export interface FindAuditLogsFilter {
  clientId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedAuditLogsOutput {
  logs: AuditLogWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class IAuditLogsRepository {
  abstract save(log: AuditLog): Promise<void>;
  abstract findManyPaginated(filter: FindAuditLogsFilter): Promise<PaginatedAuditLogsOutput>;
}
