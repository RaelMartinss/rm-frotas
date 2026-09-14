import { ImpersonationSession } from '../entities/impersonation-session.entity';

export interface ImpersonationSessionWithClient {
  session: ImpersonationSession;
  targetClient: {
    id: string;
    tradeName: string;
    legalName: string;
    document: string;
    status: string;
  };
}

export abstract class IImpersonationSessionsRepository {
  abstract save(session: ImpersonationSession): Promise<void>;
  abstract findById(id: string): Promise<ImpersonationSession | null>;
  abstract findActiveBySuperAdminId(superAdminUserId: string): Promise<ImpersonationSessionWithClient | null>;
  abstract findExpiredUnended(now?: Date): Promise<ImpersonationSession[]>;
  abstract update(session: ImpersonationSession): Promise<void>;
}
