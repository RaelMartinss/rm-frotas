import { IRefreshTokenSessionRepository } from '../domain/repositories/refresh-token-session.repository.interface';
import { RefreshTokenSession } from '../domain/entities/refresh-token-session.entity';

export class InMemoryRefreshTokenSessionRepository
  implements IRefreshTokenSessionRepository
{
  public items: RefreshTokenSession[] = [];

  async save(session: RefreshTokenSession): Promise<void> {
    const itemIndex = this.items.findIndex(
      (item) => item.getId() === session.getId(),
    );

    if (itemIndex >= 0) {
      this.items[itemIndex] = session;
    } else {
      this.items.push(session);
    }
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenSession | null> {
    const session = this.items.find((item) => item.getTokenHash() === hash);
    return session ?? null;
  }

  async findAllActiveByUserId(userId: string): Promise<RefreshTokenSession[]> {
    return this.items.filter(
      (item) =>
        item.getUserId() === userId && !item.isRevoked() && !item.isExpired(),
    );
  }
}
