import { Inject, Injectable } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';

export interface LoginUseCaseRequest {
  email: string;
  password: string;
}

export interface LoginUseCaseResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    @Inject('ITokenGenerator')
    private readonly tokenGenerator: ITokenGenerator,
  ) {}

  async execute({
    email,
    password,
  }: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await user.getPassword().matches(password);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const { accessToken } = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    });

    return {
      accessToken,
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
      },
    };
  }
}