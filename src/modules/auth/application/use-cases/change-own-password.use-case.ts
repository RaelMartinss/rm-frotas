import { Inject, Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IUsersRepository } from '../../domain/repositories/users.repository.interface';
import type { IRefreshTokenSessionRepository } from '../../domain/repositories/refresh-token-session.repository.interface';
import type { ITokenGenerator } from '../cryptography/token-generator.interface';
import { Password } from '../../domain/value-objects/password.vo';
import { DeviceInfo } from '../../domain/value-objects/device-info.vo';
import { RefreshTokenSession } from '../../domain/entities/refresh-token-session.entity';

export interface ChangeOwnPasswordInput {
  userId: string;
  currentPassword?: string;
  newPassword: string;
  deviceInfo?: {
    platform?: 'mobile' | 'web';
    userAgent?: string;
  };
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
    @Optional()
    @Inject('IRefreshTokenSessionRepository')
    private readonly refreshTokenSessionRepository?: IRefreshTokenSessionRepository,
  ) {}

  async execute(input: ChangeOwnPasswordInput): Promise<ChangeOwnPasswordOutput> {
    const user = await this.usersRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Contas regulares DEVEM obrigatoriamente informar currentPassword; apenas primeiro acesso (mustChangePassword) é isento
    if (!user.getMustChangePassword()) {
      if (!input.currentPassword) {
        throw new BadRequestException('A senha atual é obrigatória para alterar sua senha.');
      }
      const isValid = await user.getPassword().matches(input.currentPassword);
      if (!isValid) {
        throw new BadRequestException('A senha atual fornecida está incorreta.');
      }
    } else if (input.currentPassword) {
      const isValid = await user.getPassword().matches(input.currentPassword);
      if (!isValid) {
        throw new BadRequestException('A senha temporária fornecida está incorreta.');
      }
    }

    if (
      !input.newPassword ||
      input.newPassword.length < 8 ||
      !/[A-Za-z]/.test(input.newPassword) ||
      !/\d/.test(input.newPassword)
    ) {
      throw new BadRequestException(
        'A nova senha deve conter no mínimo 8 caracteres, incluindo ao menos uma letra e um número.',
      );
    }

    const isSameAsOld = await user.getPassword().matches(input.newPassword);
    if (isSameAsOld) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    // Altera a senha e desativa mustChangePassword
    const newPasswordVo = await Password.create(input.newPassword);
    user.changePassword(newPasswordVo);

    await this.usersRepository.save(user);

    // Gera novo accessToken refletindo mustChangePassword: false
    const tokens = await this.tokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      clientId: user.getClientId() ?? null,
      mustChangePassword: false,
    });

    // Revoga todas as sessões antigas e cria uma nova RefreshTokenSession real no banco
    let issuedRefreshToken = tokens.refreshToken;
    if (this.refreshTokenSessionRepository) {
      const activeSessions = await this.refreshTokenSessionRepository.findAllActiveByUserId(
        user.getId(),
      );
      await Promise.all(
        activeSessions.map((session) => {
          session.revoke();
          return this.refreshTokenSessionRepository!.save(session);
        }),
      );

      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const session = RefreshTokenSession.create({
        userId: user.getId(),
        tokenHash,
        deviceInfo: DeviceInfo.create(
          input.deviceInfo?.platform ?? 'mobile',
          input.deviceInfo?.userAgent,
        ),
      });
      await this.refreshTokenSessionRepository.save(session);
      issuedRefreshToken = rawRefreshToken;
    }

    return {
      message: 'Senha alterada com sucesso!',
      accessToken: tokens.accessToken,
      refreshToken: issuedRefreshToken,
    };
  }
}
