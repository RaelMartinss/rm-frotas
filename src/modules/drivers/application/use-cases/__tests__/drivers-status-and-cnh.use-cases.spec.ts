import { describe, it, expect, beforeEach } from 'vitest';
import { ActivateDriverUseCase } from '../activate-driver.use-case';
import { DeactivateDriverUseCase } from '../deactivate-driver.use-case';
import { SuspendDriverUseCase } from '../suspend-driver.use-case';
import { LiftDriverSuspensionUseCase } from '../lift-driver-suspension.use-case';
import { UpdateDriverCnhUseCase } from '../update-driver-cnh.use-case';
import { Driver } from '../../../domain/entities/driver.entity';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
import { SuspensionReasonCategory } from '../../../domain/entities/driver-suspension.entity';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { Cnh } from '../../../domain/value-objects/cnh.vo';
import { DriverNotFoundException } from '../../../domain/exceptions/driver-not-found.exception';
import { InvalidDriverStatusTransitionException } from '../../../domain/exceptions/invalid-driver-status-transition.exception';
import { InMemoryDriversRepository } from '../../../infrastructure/repositories/in-memory-drivers.repository';
import { InMemoryDriverSuspensionsRepository } from '../../../infrastructure/repositories/in-memory-driver-suspensions.repository';
import { DriverAvailabilityChecker } from '../../../domain/services/driver-availability-checker.service';

describe('Drivers Status & CNH Use Cases', () => {
  let repository: InMemoryDriversRepository;
  let suspensionsRepository: InMemoryDriverSuspensionsRepository;
  let activateUseCase: ActivateDriverUseCase;
  let deactivateUseCase: DeactivateDriverUseCase;
  let suspendUseCase: SuspendDriverUseCase;
  let liftUseCase: LiftDriverSuspensionUseCase;
  let updateCnhUseCase: UpdateDriverCnhUseCase;
  let existingDriver: Driver;

  beforeEach(async () => {
    repository = new InMemoryDriversRepository();
    suspensionsRepository = new InMemoryDriverSuspensionsRepository();
    const availabilityChecker = new DriverAvailabilityChecker({
      hasActiveTrip: async () => false,
    });

    activateUseCase = new ActivateDriverUseCase(repository);
    deactivateUseCase = new DeactivateDriverUseCase(repository);
    suspendUseCase = new SuspendDriverUseCase(
      repository,
      suspensionsRepository,
      availabilityChecker,
    );
    liftUseCase = new LiftDriverSuspensionUseCase(
      repository,
      suspensionsRepository,
    );
    updateCnhUseCase = new UpdateDriverCnhUseCase(repository);

    existingDriver = new Driver({
      name: 'Rael Martins',
      cpf: new Cpf('529.982.247-25'),
      cnh: new Cnh('12345678901', 'AB', new Date('2030-01-01')),
      ownerId: 'owner-1',
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
      const result = await suspendUseCase.execute({
        driverId: existingDriver.getId(),
        ownerId: 'owner-1',
        suspendedBy: 'user-manager-1',
        reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
        indefinite: true,
      });

      expect(result.getDriverId()).toBe(existingDriver.getId());
      expect(repository.items[0].getStatus()).toBe(DriverStatus.SUSPENDED);
    });

    it('deve lancar InvalidDriverStatusTransitionException se tentar suspender um motorista inativo', async () => {
      await deactivateUseCase.execute(existingDriver.getId());

      await expect(
        suspendUseCase.execute({
          driverId: existingDriver.getId(),
          ownerId: 'owner-1',
          suspendedBy: 'user-manager-1',
          reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
          indefinite: true,
        }),
      ).rejects.toThrow(InvalidDriverStatusTransitionException);
    });
  });

  describe('ActivateDriverUseCase', () => {
    it('deve reativar um motorista suspenso', async () => {
      await suspendUseCase.execute({
        driverId: existingDriver.getId(),
        ownerId: 'owner-1',
        suspendedBy: 'user-manager-1',
        reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
        indefinite: true,
      });

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