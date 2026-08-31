import { describe, it, expect, beforeEach } from 'vitest';
import { CreateDriverUseCase } from '../create-driver.use-case';
import { IDriversRepository } from '../../../domain/repositories/drivers.repository';
import { Driver } from '../../../domain/entities/driver.entity';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { DriverAlreadyExistsException } from '../../../domain/exceptions/driver-already-exists.exception';

class InMemoryDriversRepository implements IDriversRepository {
  public items: Driver[] = [];

  async save(driver: Driver): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === driver.getId());
    if (index >= 0) {
      this.items[index] = driver;
    } else {
      this.items.push(driver);
    }
  }

  async findById(id: string): Promise<Driver | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }

  async findByCpf(cpf: Cpf): Promise<Driver | null> {
    return this.items.find((item) => item.getCpf().equals(cpf)) ?? null;
  }

  async findAll(): Promise<Driver[]> {
    return this.items;
  }
}

describe('CreateDriverUseCase', () => {
  let sut: CreateDriverUseCase;
  let repository: InMemoryDriversRepository;

  beforeEach(() => {
    repository = new InMemoryDriversRepository();
    sut = new CreateDriverUseCase(repository);
  });

  it('deve criar um motorista com sucesso', async () => {
    const driver = await sut.execute({
      name: 'Rael Martins',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
    });

    expect(driver.getId()).toBeDefined();
    expect(driver.getName()).toBe('Rael Martins');
    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].getCpf().getValue()).toBe('52998224725');
  });

  it('deve lançar DriverAlreadyExistsException se o CPF já estiver cadastrado', async () => {
    await sut.execute({
      name: 'Rael Martins',
      cpf: '529.982.247-25',
      cnhNumber: '12345678901',
      cnhCategory: 'AB',
      cnhExpirationDate: new Date('2030-01-01'),
    });

    await expect(
      sut.execute({
        name: 'Outro Motorista',
        cpf: '529.982.247-25', // Mesmo CPF
        cnhNumber: '98765432100',
        cnhCategory: 'B',
        cnhExpirationDate: new Date('2032-01-01'),
      }),
    ).rejects.toThrow(DriverAlreadyExistsException);
  });
});