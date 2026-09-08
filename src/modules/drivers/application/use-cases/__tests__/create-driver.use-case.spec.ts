import { describe, it, expect, beforeEach } from 'vitest';
import { CreateDriverUseCase } from '../create-driver.use-case';
import { InMemoryDriversRepository } from '../../../infrastructure/repositories/in-memory-drivers.repository';
import { InMemoryUsersRepository } from '../../../../auth/repositories/in-memory-users.repository';
import { DriverAlreadyExistsException } from '../../../domain/exceptions/driver-already-exists.exception';
import { UserEmailAlreadyExistsException } from '../../../../auth/domain/exceptions/role-hierarchy.exceptions';

describe('CreateDriverUseCase', () => {
  let sut: CreateDriverUseCase;
  let driversRepository: InMemoryDriversRepository;
  let usersRepository: InMemoryUsersRepository;

  beforeEach(() => {
    driversRepository = new InMemoryDriversRepository();
    usersRepository = new InMemoryUsersRepository();
    sut = new CreateDriverUseCase(driversRepository, usersRepository);
  });

  it('deve criar um motorista e seu usuário vinculado com senha temporária com sucesso', async () => {
    const result = await sut.execute({
      name: 'Rael Martins',
      email: 'rael.driver@empresa.com',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
      ownerId: 'owner-uuid-456',
      clientId: 'client-uuid-123',
    });

    expect(result.driver.getId()).toBeDefined();
    expect(result.driver.getName()).toBe('Rael Martins');
    expect(result.driver.getOwnerId()).toBe('owner-uuid-456');
    expect(result.driver.getClientId()).toBe('client-uuid-123');
    expect(result.driver.getUserId()).toBeDefined();
    expect(result.temporaryPassword).toMatch(/^Temp#[0-9A-F]{8}$/);
    expect(result.user.email).toBe('rael.driver@empresa.com');
    expect(result.user.role).toBe('DRIVER');

    expect(driversRepository.items).toHaveLength(1);
    expect(driversRepository.items[0].getCpf().getValue()).toBe('52998224725');
    expect(usersRepository.items).toHaveLength(1);
    expect(usersRepository.items[0].getEmail().getValue()).toBe('rael.driver@empresa.com');
  });

  it('deve lançar DriverAlreadyExistsException se o CPF já estiver cadastrado', async () => {
    await sut.execute({
      name: 'Rael Martins',
      email: 'rael.driver@empresa.com',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
    });

    await expect(
      sut.execute({
        name: 'Outro Motorista',
        email: 'outro.driver@empresa.com',
        cpf: '529.982.247-25', // Mesmo CPF
        cnhNumber: '98765432100',
        cnhCategory: 'B',
        cnhExpirationDate: new Date('2032-01-01'),
      }),
    ).rejects.toThrow(DriverAlreadyExistsException);
  });

  it('deve vincular uma conta DRIVER existente criada sem perfil de motorista', async () => {
    // 1. Cria um usuário DRIVER solto (como acontecia no menu de Usuários antigo)
    const driverResult = await sut.execute({
      name: 'Motorista Anterior',
      email: 'driver.solto@empresa.com',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
      ownerId: 'owner-1',
    });

    // Remove o motorista do repositório para simular um User DRIVER órfão
    driversRepository.items = [];

    // 2. Tenta criar o motorista com o mesmo e-mail
    const recoveryResult = await sut.execute({
      name: 'Rael Martins',
      email: 'driver.solto@empresa.com',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
      ownerId: 'owner-1',
    });

    expect(recoveryResult.driver.getId()).toBeDefined();
    expect(recoveryResult.driver.getUserId()).toBe(driverResult.user.id);
    expect(recoveryResult.temporaryPassword).toBeDefined();
    expect(driversRepository.items).toHaveLength(1);
    expect(usersRepository.items).toHaveLength(1);
  });

  it('deve lançar UserEmailAlreadyExistsException se o e-mail já estiver em uso por outro motorista já vinculado', async () => {
    await sut.execute({
      name: 'Rael Martins',
      email: 'mesmo.email@empresa.com',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
    });

    await expect(
      sut.execute({
        name: 'Segundo Motorista',
        email: 'mesmo.email@empresa.com', // Mesmo e-mail
        cpf: '111.444.777-35',
        cnhNumber: '98765432100',
        cnhCategory: 'B',
        cnhExpirationDate: new Date('2032-01-01'),
      }),
    ).rejects.toThrow(UserEmailAlreadyExistsException);
  });
});