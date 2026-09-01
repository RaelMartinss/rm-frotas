import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { RegisterUserUseCase } from '../register-user.use-case';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { UserRole } from '../../../domain/entities/user.entity';
import { InvalidEmailException } from '../../../domain/exceptions/invalid-email.exception';

describe('RegisterUserUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let sut: RegisterUserUseCase; // System Under Test

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    sut = new RegisterUserUseCase(inMemoryUsersRepository);
  });

  it('deve ser possível cadastrar um novo usuário com sucesso', async () => {
    const user = await sut.execute({
      name: 'Rael Martins',
      email: 'rael@example.com',
      password: 'password123',
      role: UserRole.FLEET_MANAGER,
    });

    expect(user.getId()).toBeDefined();
    expect(user.getName()).toBe('Rael Martins');
    expect(user.getEmail().getValue()).toBe('rael@example.com');
    expect(user.getRole()).toBe(UserRole.FLEET_MANAGER);
    expect(inMemoryUsersRepository.items).toHaveLength(1);
  });

  it('não deve ser possível cadastrar dois usuários com o mesmo e-mail', async () => {
    await sut.execute({
      name: 'Rael Martins',
      email: 'rael@example.com',
      password: 'password123',
      role: UserRole.FLEET_MANAGER,
    });

    await expect(() =>
      sut.execute({
        name: 'Outro Usuário',
        email: 'rael@example.com',
        password: 'password456',
        role: UserRole.DRIVER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve armazenar a senha de forma hasheada (não em texto puro)', async () => {
    const user = await sut.execute({
      name: 'Rael Martins',
      email: 'rael@example.com',
      password: 'secret_password',
      role: UserRole.FLEET_MANAGER,
    });

    const plainPasswordMatch = await user.getPassword().matches('secret_password');
    expect(plainPasswordMatch).toBe(true);
    expect(user.getPassword().getHash()).not.toBe('secret_password');
  });

  it('deve lançar InvalidEmailException caso o e-mail seja inválido', async () => {
    await expect(() =>
      sut.execute({
        name: 'Rael Martins',
        email: 'email-invalido',
        password: 'password123',
        role: UserRole.FLEET_MANAGER,
      }),
    ).rejects.toBeInstanceOf(InvalidEmailException);
  });
});