import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { Password } from '../../domain/value-objects/password.vo';

export interface ChangeOwnPasswordInput {
  userId: string;
  currentPassword?: string;
  newPassword: string;
}

export interface ChangeOwnPasswordOutput {
  message: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class ChangeOwnPasswordUseCase {
  constructor(
    @Inject('IUsersRepository')
    private readonly usersRepository: IUsersRepository,
    @Inject('ITokenGenerator')
    private readonly tokenGenerator: ITokenGenerator,
  ) {}

  async execute(input: ChangeOwnPasswordInput): Promise<ChangeOwnPasswordOutput> {
    const user = await this.usersRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Se informou currentPassword, valida se confere com a senha atual
    if (input.currentPassword) {
      const isValid = await user.getPassword().matches(input.currentPassword);
      if (!isValid) {
        throw new BadRequestException('A senha atual fornecida está incorreta.');
      }
    }

    if (!input.newPassword || input.newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve conter no mínimo 6 caracteres.');
    }

    // Altera a senha e desativa mustChangePassword
    const newPasswordVo = await Password.create(input.newPassword);
    user.changePassword(newPasswordVo);

    await this.usersRepository.save(user);

    // Gera novos tokens refletindo mustChangePassword: false
    const tokens = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      mustChangePassword: false,
    });

    return {
      message: 'Senha alterada com sucesso!',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
