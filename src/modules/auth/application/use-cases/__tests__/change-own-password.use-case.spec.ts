import { beforeEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { DeviceInfo } from '../../../domain/value-objects/device-info.vo';
import { RefreshTokenSession } from '../../../domain/entities/refresh-token-session.entity';
import { ChangeOwnPasswordUseCase } from '../change-own-password.use-case';
import { FakeTokenGenerator } from '../../../cryptography/fake-token-generator';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { InMemoryRefreshTokenSessionRepository } from '../../../repositories/in-memory-refresh-token-session.repository';

describe('ChangeOwnPasswordUseCase', () => {
  let usersRepository: InMemoryUsersRepository;
  let refreshTokenSessionRepository: InMemoryRefreshTokenSessionRepository;
  let tokenGenerator: FakeTokenGenerator;
  let sut: ChangeOwnPasswordUseCase;

  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    refreshTokenSessionRepository = new InMemoryRefreshTokenSessionRepository();
    tokenGenerator = new FakeTokenGenerator();
    sut = new ChangeOwnPasswordUseCase(
      usersRepository,
      tokenGenerator,
      refreshTokenSessionRepository,
    );
  });

  it('deve exigir currentPassword para contas que não estão em primeiro acesso', async () => {
    const password = await Password.create('SenhaAtual123');
    const user = new User({
      name: 'Rael Motorista',
      email: new Email('motorista@rmfrotas.com.br'),
      password,
      role: UserRole.DRIVER,
      mustChangePassword: false,
    });
    await usersRepository.save(user);

    await expect(() =>
      sut.execute({
        userId: user.getId(),
        newPassword: 'NovaSenha123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar senha fraca (menos de 8 caracteres ou sem letras e números)', async () => {
    const password = await Password.create('TempPass123');
    const user = new User({
      name: 'Rael Motorista',
      email: new Email('motorista@rmfrotas.com.br'),
      password,
      role: UserRole.DRIVER,
      mustChangePassword: true,
    });
    await usersRepository.save(user);

    await expect(() =>
      sut.execute({
        userId: user.getId(),
        newPassword: '12345678',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(() =>
      sut.execute({
        userId: user.getId(),
        newPassword: 'somenteletras',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve revogar todas as sessões antigas e persistir uma nova RefreshTokenSession opaca ao trocar a senha', async () => {
    const password = await Password.create('TempPass123');
    const user = new User({
      name: 'Rael Motorista',
      email: new Email('motorista@rmfrotas.com.br'),
      password,
      role: UserRole.DRIVER,
      mustChangePassword: true,
    });
    await usersRepository.save(user);

    const oldSessionHash = crypto.createHash('sha256').update('old-refresh').digest('hex');
    const oldSession = RefreshTokenSession.create({
      userId: user.getId(),
      tokenHash: oldSessionHash,
      deviceInfo: DeviceInfo.create('mobile'),
    });
    await refreshTokenSessionRepository.save(oldSession);

    const result = await sut.execute({
      userId: user.getId(),
      newPassword: 'NovaSenhaForte2026',
      deviceInfo: { platform: 'mobile' },
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // Sessão antiga revogada
    const revokedOld = await refreshTokenSessionRepository.findByTokenHash(oldSessionHash);
    expect(revokedOld?.isRevoked()).toBe(true);

    // Nova sessão salva por hash SHA-256 e pronta para /auth/refresh
    const newHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    const persistedNew = await refreshTokenSessionRepository.findByTokenHash(newHash);
    expect(persistedNew).toBeDefined();
    expect(persistedNew?.isRevoked()).toBe(false);
    expect(user.getMustChangePassword()).toBe(false);
  });
});
