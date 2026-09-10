import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { IClientsRepository } from '../../../clients/domain/repositories/clients.repository.interface';
import type { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { UserStatus } from '../../domain/entities/user.entity';
import { ClientStatus } from '../../../clients/domain/enums/client-status.enum';
import { DeviceInfo } from '../../domain/value-objects/device-info.vo';
import { RefreshTokenSession } from '../../domain/entities/refresh-token-session.entity';

export interface LoginUseCaseRequest {
  email: string;
  password: string;
  deviceInfo?: {
    platform?: 'mobile' | 'web';
    userAgent?: string;
  };
}

export interface LoginUseCaseResponse {
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
export class LoginUseCase {
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
    email,
    password,
    deviceInfo: rawDeviceInfo,
  }: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsException();
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

    const isPasswordValid = await user.getPassword().matches(password);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const { accessToken } = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      mustChangePassword: user.getMustChangePassword(),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const deviceInfo = DeviceInfo.create(
      rawDeviceInfo?.platform,
      rawDeviceInfo?.userAgent,
    );

    const session = RefreshTokenSession.create({
      userId: user.getId(),
      tokenHash,
      deviceInfo,
    });

    await this.refreshTokenSessionRepository.save(session);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 7200, // 2h em segundos
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