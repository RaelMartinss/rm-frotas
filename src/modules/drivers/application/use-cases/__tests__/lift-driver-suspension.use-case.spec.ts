import { LiftDriverSuspensionUseCase } from '../lift-driver-suspension.use-case';
import { InMemoryDriversRepository } from '../../../infrastructure/repositories/in-memory-drivers.repository';
import { InMemoryDriverSuspensionsRepository } from '../../../infrastructure/repositories/in-memory-driver-suspensions.repository';
import { Driver, DriverStatus } from '../../../domain/entities/driver.entity';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { Cnh } from '../../../domain/value-objects/cnh.vo';
import {
  DriverSuspension,
  SuspensionReasonCategory,
  SuspensionStatus,
} from '../../../domain/entities/driver-suspension.entity';
import { DriverSuspensionNotFoundException } from '../../../domain/exceptions/driver-suspension-not-found.exception';

describe('LiftDriverSuspensionUseCase', () => {
  let useCase: LiftDriverSuspensionUseCase;
  let driversRepository: InMemoryDriversRepository;
  let suspensionsRepository: InMemoryDriverSuspensionsRepository;

  beforeEach(() => {
    driversRepository = new InMemoryDriversRepository();
    suspensionsRepository = new InMemoryDriverSuspensionsRepository();
    useCase = new LiftDriverSuspensionUseCase(
      driversRepository,
      suspensionsRepository,
    );
  });

  it('should successfully lift active suspension and activate driver', async () => {
    const driver = new Driver({
      name: 'Marcos Paulo',
      cpf: new Cpf('12345678909'),
      cnh: new Cnh('12345678900', 'D', new Date('2028-10-01')),
      ownerId: 'owner-1',
      status: DriverStatus.SUSPENDED,
    });
    await driversRepository.create(driver);

    const suspension = new DriverSuspension({
      driverId: driver.getId(),
      ownerId: 'owner-1',
      reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
      suspendedBy: 'user-manager-1',
      indefinite: true,
    });
    await suspensionsRepository.create(suspension);

    const result = await useCase.execute({
      driverId: driver.getId(),
      ownerId: 'owner-1',
      liftedBy: 'user-manager-1',
      liftReason: 'CNH regularizada',
    });

    expect(result.getStatus()).toBe(SuspensionStatus.ENCERRADA);
    expect(result.getLiftReason()).toBe('CNH regularizada');
    expect(result.getLiftedBy()).toBe('user-manager-1');

    const updatedDriver = await driversRepository.findById(driver.getId());
    expect(updatedDriver?.getStatus()).toBe(DriverStatus.ACTIVE);
  });

  it('should throw DriverSuspensionNotFoundException if no active suspension exists', async () => {
    const driver = new Driver({
      name: 'Marcos Paulo',
      cpf: new Cpf('12345678909'),
      cnh: new Cnh('12345678900', 'D', new Date('2028-10-01')),
      ownerId: 'owner-1',
      status: DriverStatus.ACTIVE,
    });
    await driversRepository.create(driver);

    await expect(
      useCase.execute({
        driverId: driver.getId(),
        ownerId: 'owner-1',
        liftedBy: 'user-manager-1',
      }),
    ).rejects.toThrow(DriverSuspensionNotFoundException);
  });
});
