import { beforeEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { DeviceInfo } from '../../../domain/value-objects/device-info.vo';
import { RefreshTokenSession } from '../../../domain/entities/refresh-token-session.entity';
import { RefreshTokenUseCase } from '../refresh-token.use-case';
import { FakeTokenGenerator } from '../../../cryptography/fake-token-generator';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { InMemoryClientsRepository } from '../../../../clients/repositories/in-memory-clients.repository';
import { InMemoryRefreshTokenSessionRepository } from '../../../repositories/in-memory-refresh-token-session.repository';
import { UnauthorizedException } from '@nestjs/common';
import { SessionRevokedException } from '../../../domain/exceptions/session-revoked.exception';
import { SessionExpiredException } from '../../../domain/exceptions/session-expired.exception';

describe('RefreshTokenUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let inMemoryClientsRepository: InMemoryClientsRepository;
  let inMemoryRefreshTokenSessionRepository: InMemoryRefreshTokenSessionRepository;
  let fakeTokenGenerator: FakeTokenGenerator;
  let sut: RefreshTokenUseCase;

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    inMemoryClientsRepository = new InMemoryClientsRepository();
    inMemoryRefreshTokenSessionRepository =
      new InMemoryRefreshTokenSessionRepository();
    fakeTokenGenerator = new FakeTokenGenerator();
    sut = new RefreshTokenUseCase(
      inMemoryUsersRepository,
      fakeTokenGenerator,
      inMemoryClientsRepository,
      inMemoryRefreshTokenSessionRepository,
    );
  });

  it('deve renovar os tokens com sucesso a partir de um refresh token válido e rotacionar o token', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Rael Martins',
      email: new Email('rael@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    const initialRefreshToken = 'initial-token-12345';
    const initialHash = crypto
      .createHash('sha256')
      .update(initialRefreshToken)
      .digest('hex');

    const session = RefreshTokenSession.create({
      userId: user.getId(),
      tokenHash: initialHash,
      deviceInfo: DeviceInfo.create('web'),
    });

    await inMemoryRefreshTokenSessionRepository.save(session);

    const result = await sut.execute({
      refreshToken: initialRefreshToken,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(initialRefreshToken);
    expect(result.user.email).toBe('rael@example.com');

    // A sessão antiga deve estar revogada
    const oldSession =
      await inMemoryRefreshTokenSessionRepository.findByTokenHash(initialHash);
    expect(oldSession?.isRevoked()).toBe(true);

    // O token antigo deve falhar se usado novamente
    await expect(() =>
      sut.execute({
        refreshToken: initialRefreshToken,
      }),
    ).rejects.toBeInstanceOf(SessionRevokedException);
  });

  it('deve lançar exceção se o refresh token não for informado', async () => {
    await expect(() =>
      sut.execute({
        refreshToken: '',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve lançar exceção se a sessão não for encontrada no banco', async () => {
    await expect(() =>
      sut.execute({
        refreshToken: 'token-nao-registrado',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve lançar SessionExpiredException se a sessão estiver expirada', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Rael Martins',
      email: new Email('rael@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    const expiredToken = 'expired-token';
    const hash = crypto
      .createHash('sha256')
      .update(expiredToken)
      .digest('hex');

    const session = RefreshTokenSession.restore({
      id: 'session-exp',
      userId: user.getId(),
      tokenHash: hash,
      deviceInfo: DeviceInfo.create('web'),
      expiresAt: new Date(Date.now() - 5000), // Expirado
      revokedAt: null,
      createdAt: new Date(Date.now() - 10000),
    });

    await inMemoryRefreshTokenSessionRepository.save(session);

    await expect(() =>
      sut.execute({
        refreshToken: expiredToken,
      }),
    ).rejects.toBeInstanceOf(SessionExpiredException);
  });
});
