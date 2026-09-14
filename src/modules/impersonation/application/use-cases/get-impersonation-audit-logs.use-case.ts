import { Injectable } from '@nestjs/common';
import {
  FindAuditLogsFilter,
  IAuditLogsRepository,
  PaginatedAuditLogsOutput,
} from '../../domain/repositories/audit-logs.repository.interface';

@Injectable()
export class GetImpersonationAuditLogsUseCase {
  constructor(private readonly auditLogsRepository: IAuditLogsRepository) {}

  async execute(filter: FindAuditLogsFilter): Promise<PaginatedAuditLogsOutput> {
    return this.auditLogsRepository.findManyPaginated(filter);
  }
}
