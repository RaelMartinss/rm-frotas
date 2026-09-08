import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { IClientsRepository } from '../../../clients/domain/repositories/clients.repository.interface';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { UserStatus } from '../../domain/entities/user.entity';
import { ClientStatus } from '../../../clients/domain/enums/client-status.enum';

export interface LoginUseCaseRequest {
  email: string;
  password: string;
}

export interface LoginUseCaseResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    clientId: string | null;
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
  ) {}

  async execute({
    email,
    password,
  }: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    if (user.getStatus() === UserStatus.INACTIVE || !user.isActive()) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    // Se o usuário pertencer a uma empresa cliente, verifica se ela está ativa
    if (user.getClientId()) {
      const client = await this.clientsRepository.findById(user.getClientId()!);
      if (client && (client.getStatus() === ClientStatus.SUSPENSO || client.getStatus() === ClientStatus.CANCELADO)) {
        throw new UnauthorizedException('Acesso bloqueado: a empresa contratante está suspensa ou cancelada.');
      }
    }

    const isPasswordValid = await user.getPassword().matches(password);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const { accessToken, refreshToken } = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      mustChangePassword: user.getMustChangePassword(),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        clientId: user.getClientId() ?? null,
        mustChangePassword: user.getMustChangePassword(),
      },
    };
  }
}