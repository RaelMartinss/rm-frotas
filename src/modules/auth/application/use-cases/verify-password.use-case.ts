import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';

export interface VerifyPasswordUseCaseRequest {
  userId: string;
  password: string;
}

export interface VerifyPasswordUseCaseResponse {
  valid: boolean;
}

@Injectable()
export class VerifyPasswordUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute({
    userId,
    password,
  }: VerifyPasswordUseCaseRequest): Promise<VerifyPasswordUseCaseResponse> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const valid = await user.verifyPassword(password);

    return { valid };
  }
}
