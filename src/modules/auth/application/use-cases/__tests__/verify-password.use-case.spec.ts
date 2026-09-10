import { beforeEach, describe, expect, it } from 'vitest';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { VerifyPasswordUseCase } from '../verify-password.use-case';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { NotFoundException } from '@nestjs/common';

describe('VerifyPasswordUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let sut: VerifyPasswordUseCase;

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    sut = new VerifyPasswordUseCase(inMemoryUsersRepository);
  });

  it('deve retornar valid: true quando a senha estiver correta', async () => {
    const password = await Password.create('senhaCerta123');
    const user = new User({
      name: 'Gestor Silva',
      email: new Email('gestor@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    const result = await sut.execute({
      userId: user.getId(),
      password: 'senhaCerta123',
    });

    expect(result.valid).toBe(true);
  });

  it('deve retornar valid: false quando a senha estiver incorreta', async () => {
    const password = await Password.create('senhaCerta123');
    const user = new User({
      name: 'Gestor Silva',
      email: new Email('gestor@example.com'),
      password,
      role: UserRole.FLEET_MANAGER,
    });

    await inMemoryUsersRepository.save(user);

    const result = await sut.execute({
      userId: user.getId(),
      password: 'senhaErrada999',
    });

    expect(result.valid).toBe(false);
  });

  it('deve lançar NotFoundException se o usuário não for encontrado', async () => {
    await expect(() =>
      sut.execute({
        userId: 'id-inexistente',
        password: 'qualquer-senha',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
