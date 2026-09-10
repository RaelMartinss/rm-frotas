import { RefreshTokenSession } from '../entities/refresh-token-session.entity';

export interface IRefreshTokenSessionRepository {
  save(session: RefreshTokenSession): Promise<void>;
  findByTokenHash(hash: string): Promise<RefreshTokenSession | null>;
  findAllActiveByUserId(userId: string): Promise<RefreshTokenSession[]>;
}
