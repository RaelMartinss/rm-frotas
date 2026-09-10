import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { IClientsRepository } from '../../../clients/domain/repositories/clients.repository.interface';
import type { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { UserStatus } from '../../domain/entities/user.entity';
import { ClientStatus } from '../../../clients/domain/enums/client-status.enum';
import { SessionExpiredException } from '../../domain/exceptions/session-expired.exception';
import { SessionRevokedException } from '../../domain/exceptions/session-revoked.exception';
import { RefreshTokenSession } from '../../domain/entities/refresh-token-session.entity';

export interface RefreshTokenUseCaseRequest {
  refreshToken: string;
}

export interface RefreshTokenUseCaseResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    clientId: string | null;
    clientName: string | null;
    mustChangePassword: boolean;
  };
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    @Inject('ITokenGenerator')
    private readonly tokenGenerator: ITokenGenerator,
    private readonly clientsRepository: IClientsRepository,
    @Inject('IRefreshTokenSessionRepository')
    private readonly refreshTokenSessionRepository: IRefreshTokenSessionRepository,
  ) {}

  async execute({
    refreshToken,
  }: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Token de atualização não informado.');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const session =
      await this.refreshTokenSessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedException(
        'Token de atualização inválido ou inexistente.',
      );
    }

    if (session.isRevoked()) {
      throw new SessionRevokedException(session.getId());
    }

    if (session.isExpired()) {
      throw new SessionExpiredException(session.getId());
    }

    const user = await this.usersRepository.findById(session.getUserId());

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    if (user.getStatus() === UserStatus.INACTIVE || !user.isActive()) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    // Se o usuário pertencer a uma empresa cliente, verifica se ela está ativa
    let clientName: string | null = null;
    if (user.getClientId()) {
      const client = await this.clientsRepository.findById(user.getClientId()!);
      if (
        client &&
        (client.getStatus() === ClientStatus.SUSPENSO ||
          client.getStatus() === ClientStatus.CANCELADO)
      ) {
        throw new UnauthorizedException(
          'Acesso bloqueado: a empresa contratante está suspensa ou cancelada.',
        );
      }
      clientName = client?.getTradeName() ?? null;
    }

    // Rotação de refresh token: revoga a sessão anterior
    session.revoke();
    await this.refreshTokenSessionRepository.save(session);

    // Cria nova sessão mantendo o DeviceInfo anterior e emitindo um novo refresh token puro
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newRawRefreshToken)
      .digest('hex');

    const newSession = RefreshTokenSession.create({
      userId: user.getId(),
      tokenHash: newTokenHash,
      deviceInfo: session.getDeviceInfo(),
    });

    await this.refreshTokenSessionRepository.save(newSession);

    const { accessToken } = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      mustChangePassword: user.getMustChangePassword(),
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 7200,
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        clientId: user.getClientId() ?? null,
        clientName,
        mustChangePassword: user.getMustChangePassword(),
      },
    };
  }
}
