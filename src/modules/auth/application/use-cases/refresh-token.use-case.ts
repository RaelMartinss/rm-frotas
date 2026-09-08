import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { IClientsRepository } from '../../../clients/domain/repositories/clients.repository.interface';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { UserStatus } from '../../domain/entities/user.entity';
import { ClientStatus } from '../../../clients/domain/enums/client-status.enum';

export interface RefreshTokenUseCaseRequest {
  refreshToken: string;
}

export interface RefreshTokenUseCaseResponse {
  accessToken: string;
  refreshToken: string;
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
  ) {}

  async execute({
    refreshToken,
  }: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Token de atualização não informado.');
    }

    const payload = await this.tokenGenerator.verifyRefreshToken(refreshToken);

    const user = await this.usersRepository.findById(payload.sub);

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
      if (client && (client.getStatus() === ClientStatus.SUSPENSO || client.getStatus() === ClientStatus.CANCELADO)) {
        throw new UnauthorizedException('Acesso bloqueado: a empresa contratante está suspensa ou cancelada.');
      }
      clientName = client?.getTradeName() ?? null;
    }

    const tokens = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      mustChangePassword: user.getMustChangePassword(),
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

