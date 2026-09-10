import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import type { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import { UserRole } from '../../domain/entities/user.entity';

export interface LogoutAllDevicesUseCaseRequest {
  currentUserId: string;
  currentUserRole: string;
  currentClientId?: string | null;
  targetUserId?: string;
}

@Injectable()
export class LogoutAllDevicesUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    @Inject('IRefreshTokenSessionRepository')
    private readonly refreshTokenSessionRepository: IRefreshTokenSessionRepository,
  ) {}

  async execute({
    currentUserId,
    currentUserRole,
    currentClientId,
    targetUserId,
  }: LogoutAllDevicesUseCaseRequest): Promise<void> {
    const effectiveUserId = targetUserId || currentUserId;

    // Se estiver tentando revogar as sessões de outro usuário
    if (targetUserId && targetUserId !== currentUserId) {
      if (currentUserRole === UserRole.DRIVER) {
        throw new ForbiddenException(
          'Motoristas só podem revogar suas próprias sessões.',
        );
      }

      if (
        currentUserRole === UserRole.FLEET_MANAGER ||
        currentUserRole === UserRole.ADMIN
      ) {
        const targetUser = await this.usersRepository.findById(targetUserId);

        if (!targetUser) {
          throw new NotFoundException('Usuário não encontrado.');
        }

        if (targetUser.getClientId() !== currentClientId) {
          throw new ForbiddenException(
            'Não é permitido revogar sessões de usuários de outra organização.',
          );
        }
      }
    }

    const activeSessions =
      await this.refreshTokenSessionRepository.findAllActiveByUserId(
        effectiveUserId,
      );

    for (const session of activeSessions) {
      session.revoke();
      await this.refreshTokenSessionRepository.save(session);
    }
  }
}
