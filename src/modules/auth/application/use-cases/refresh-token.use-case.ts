import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { UserStatus } from '../../domain/entities/user.entity';

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
  };
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    @Inject('ITokenGenerator')
    private readonly tokenGenerator: ITokenGenerator,
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

    const tokens = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
      },
    };
  }
}
