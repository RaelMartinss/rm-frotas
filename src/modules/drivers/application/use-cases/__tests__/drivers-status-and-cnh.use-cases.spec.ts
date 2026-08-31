import { describe, it, expect, beforeEach } from 'vitest';
import { ActivateDriverUseCase } from '../activate-driver.use-case';
import { DeactivateDriverUseCase } from '../deactivate-driver.use-case';
import { SuspendDriverUseCase } from '../suspend-driver.use-case';
import { UpdateDriverCnhUseCase } from '../update-driver-cnh.use-case';
import type { IDriversRepository } from '../../../domain/repositories/drivers.repository';
import { Driver } from '../../../domain/entities/driver.entity';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { Cnh } from '../../../domain/value-objects/cnh.vo';
import { DriverNotFoundException } from '../../../domain/exceptions/driver-not-found.exception';
import { InvalidDriverStatusTransitionException } from '../../../domain/exceptions/invalid-driver-status-transition.exception';

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

describe('Drivers Status & CNH Use Cases', () => {
  let repository: InMemoryDriversRepository;
  let activateUseCase: ActivateDriverUseCase;
  let deactivateUseCase: DeactivateDriverUseCase;
  let suspendUseCase: SuspendDriverUseCase;
  let updateCnhUseCase: UpdateDriverCnhUseCase;
  let existingDriver: Driver;

  beforeEach(async () => {
    repository = new InMemoryDriversRepository();
    activateUseCase = new ActivateDriverUseCase(repository);
    deactivateUseCase = new DeactivateDriverUseCase(repository);
    suspendUseCase = new SuspendDriverUseCase(repository);
    updateCnhUseCase = new UpdateDriverCnhUseCase(repository);

    existingDriver = new Driver({
      name: 'Rael Martins',
      cpf: new Cpf('529.982.247-25'),
      cnh: new Cnh('12345678901', 'AB', new Date('2030-01-01')),
      status: DriverStatus.ACTIVE,
    });

    await repository.save(existingDriver);
  });

  describe('DeactivateDriverUseCase', () => {
    it('deve desativar um motorista ativo com sucesso', async () => {
      const result = await deactivateUseCase.execute(existingDriver.getId());

      expect(result.getStatus()).toBe(DriverStatus.INACTIVE);
      expect(repository.items[0].getStatus()).toBe(DriverStatus.INACTIVE);
    });

    it('deve lançar DriverNotFoundException caso o ID não exista', async () => {
      await expect(deactivateUseCase.execute('invalid-id')).rejects.toThrow(
        DriverNotFoundException,
      );
    });
  });

  describe('SuspendDriverUseCase', () => {
    it('deve suspender um motorista ativo com sucesso', async () => {
      const result = await suspendUseCase.execute(existingDriver.getId());

      expect(result.getStatus()).toBe(DriverStatus.SUSPENDED);
      expect(repository.items[0].getStatus()).toBe(DriverStatus.SUSPENDED);
    });

    it('deve lancar InvalidDriverStatusTransitionException se tentar suspender um motorista inativo', async () => {
      await deactivateUseCase.execute(existingDriver.getId());

      await expect(suspendUseCase.execute(existingDriver.getId())).rejects.toThrow(
        InvalidDriverStatusTransitionException,
      );
    });
  });

  describe('ActivateDriverUseCase', () => {
    it('deve reativar um motorista suspenso', async () => {
      await suspendUseCase.execute(existingDriver.getId());

      const result = await activateUseCase.execute(existingDriver.getId());

      expect(result.getStatus()).toBe(DriverStatus.ACTIVE);
      expect(repository.items[0].getStatus()).toBe(DriverStatus.ACTIVE);
    });
  });

  describe('UpdateDriverCnhUseCase', () => {
    it('deve atualizar a CNH do motorista com sucesso', async () => {
      const newExpiration = new Date('2035-05-10');

      const result = await updateCnhUseCase.execute({
        driverId: existingDriver.getId(),
        cnhNumber: '98765432100',
        cnhCategory: 'D',
        cnhExpirationDate: newExpiration,
      });

      expect(result.getCnh().getNumber()).toBe('98765432100');
      expect(result.getCnh().getCategory()).toBe('D');
      expect(result.getCnh().getExpirationDate()).toEqual(newExpiration);
    });
  });
});