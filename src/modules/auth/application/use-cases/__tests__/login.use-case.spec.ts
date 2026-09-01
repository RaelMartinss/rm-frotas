import { beforeEach, describe, expect, it } from 'vitest';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { LoginUseCase } from '../login.use-case';
import { FakeTokenGenerator } from '../../../cryptography/fake-token-generator';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';
import { InvalidCredentialsException } from '../../../domain/exceptions/invalid-credentials.exception';


describe('LoginUseCase', () => {
  let inMemoryUsersRepository: InMemoryUsersRepository;
  let fakeTokenGenerator: FakeTokenGenerator;
  let sut: LoginUseCase;

  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository();
    fakeTokenGenerator = new FakeTokenGenerator();
    sut = new LoginUseCase(inMemoryUsersRepository, fakeTokenGenerator);
  });

  it('deve autenticar um usuário com credenciais válidas e retornar o token', async () => {
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
    expect(result.user.email).toBe('rael@example.com');
    expect(result.user.role).toBe(UserRole.FLEET_MANAGER);
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