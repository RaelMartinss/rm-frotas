import { beforeEach, describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { LoginUseCase } from '../login.use-case';
import { FakeTokenGenerator } from '../../../cryptography/fake-token-generator';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { InMemoryClientsRepository } from '../../../../clients/repositories/in-memory-clients.repository';
import { InMemoryRefreshTokenSessionRepository } from '../../../repositories/in-memory-refresh-token-session.repository';
import { InvalidCredentialsException } from '../../../domain/exceptions/invalid-credentials.exception';

describe('LoginUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let inMemoryClientsRepository: InMemoryClientsRepository;
  let inMemoryRefreshTokenSessionRepository: InMemoryRefreshTokenSessionRepository;
  let fakeTokenGenerator: FakeTokenGenerator;
  let sut: LoginUseCase;

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    inMemoryClientsRepository = new InMemoryClientsRepository();
    inMemoryRefreshTokenSessionRepository =
      new InMemoryRefreshTokenSessionRepository();
    fakeTokenGenerator = new FakeTokenGenerator();
    sut = new LoginUseCase(
      inMemoryUsersRepository,
      fakeTokenGenerator,
      inMemoryClientsRepository,
      inMemoryRefreshTokenSessionRepository,
    );
  });

  it('deve autenticar um usuário com credenciais válidas e retornar o token e registrar a sessão de refresh token', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Rael Martins',
      email: new Email('rael@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    const result = await sut.execute({
      email: 'rael@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(7200);
    expect(result.user.email).toBe('rael@example.com');
    expect(result.user.role).toBe(UserRole.FLEET_MANAGER);

    const expectedHash = crypto
      .createHash('sha256')
      .update(result.refreshToken)
      .digest('hex');

    const savedSession =
      await inMemoryRefreshTokenSessionRepository.findByTokenHash(expectedHash);

    expect(savedSession).not.toBeNull();
    expect(savedSession?.getUserId()).toBe(user.getId());
    expect(savedSession?.getDeviceInfo().isMobile()).toBe(false);
  });

  it('deve criar sessão de 60 dias para login mobile', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Motorista João',
      email: new Email('motorista@example.com'),
      password,
      role: UserRole.DRIVER,
    });

    await inMemoryUsersRepository.save(user);

    const before = Date.now();
    const result = await sut.execute({
      email: 'motorista@example.com',
      password: 'password123',
      deviceInfo: {
        platform: 'mobile',
        userAgent: 'Capacitor/Android',
      },
    });

    const expectedHash = crypto
      .createHash('sha256')
      .update(result.refreshToken)
      .digest('hex');

    const savedSession =
      await inMemoryRefreshTokenSessionRepository.findByTokenHash(expectedHash);

    expect(savedSession).not.toBeNull();
    expect(savedSession?.getDeviceInfo().isMobile()).toBe(true);

    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const diff = savedSession!.getExpiresAt().getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(sixtyDaysMs - 1000);
  });

  it('não deve autenticar com e-mail inexistente', async () => {
    await expect(() =>
      sut.execute({
        email: 'naoexistente@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('não deve autenticar com senha incorreta', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Rael Martins',
      email: new Email('rael@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    await expect(() =>
      sut.execute({
        email: 'rael@example.com',
        password: 'senha_errada',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });
});