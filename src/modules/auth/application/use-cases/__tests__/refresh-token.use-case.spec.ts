import { beforeEach, describe, expect, it } from 'vitest';
import { User, UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { RefreshTokenUseCase } from '../refresh-token.use-case';
import { FakeTokenGenerator } from '../../../cryptography/fake-token-generator';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshTokenUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let fakeTokenGenerator: FakeTokenGenerator;
  let sut: RefreshTokenUseCase;

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    fakeTokenGenerator = new FakeTokenGenerator();
    sut = new RefreshTokenUseCase(inMemoryUsersRepository, fakeTokenGenerator);
  });

  it('deve renovar os tokens com sucesso a partir de um refresh token válido', async () => {
    const password = await Password.create('password123');
    const user = new User({
      name: 'Rael Martins',
      email: new Email('rael@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    const tokens = await fakeTokenGenerator.generate({
      sub: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    });

    const result = await sut.execute({
      refreshToken: tokens.refreshToken,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('rael@example.com');
  });

  it('deve lançar exceção se o refresh token não for informado', async () => {
    await expect(() =>
      sut.execute({
        refreshToken: '',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('não deve renovar tokens se o usuário não for encontrado', async () => {
    const tokens = await fakeTokenGenerator.generate({
      sub: 'non-existent-user-id',
      email: 'nonexistent@example.com',
      role: UserRole.FLEET_MANAGER,
    });

    await expect(() =>
      sut.execute({
        refreshToken: tokens.refreshToken,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
