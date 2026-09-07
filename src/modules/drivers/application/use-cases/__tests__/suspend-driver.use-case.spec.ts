import { SuspendDriverUseCase } from '../suspend-driver.use-case';
import { InMemoryDriversRepository } from '../../../infrastructure/repositories/in-memory-drivers.repository';
import { InMemoryDriverSuspensionsRepository } from '../../../infrastructure/repositories/in-memory-driver-suspensions.repository';
import { DriverAvailabilityChecker } from '../../../domain/services/driver-availability-checker.service';
import { Driver, DriverStatus } from '../../../domain/entities/driver.entity';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { Cnh } from '../../../domain/value-objects/cnh.vo';
import { SuspensionReasonCategory, SuspensionStatus } from '../../../domain/entities/driver-suspension.entity';
import { DriverAlreadySuspendedException } from '../../../domain/exceptions/driver-already-suspended.exception';
import { DriverHasActiveTripException } from '../../../domain/exceptions/driver-has-active-trip.exception';
import { DriverNotFoundException } from '../../../domain/exceptions/driver-not-found.exception';

describe('SuspendDriverUseCase', () => {
  let useCase: SuspendDriverUseCase;
  let driversRepository: InMemoryDriversRepository;
  let suspensionsRepository: InMemoryDriverSuspensionsRepository;
  let hasActiveTripMock: boolean;

  const mockAvailabilitySource = {
    hasActiveTrip: async () => hasActiveTripMock,
  };

  beforeEach(() => {
    driversRepository = new InMemoryDriversRepository();
    suspensionsRepository = new InMemoryDriverSuspensionsRepository();
    hasActiveTripMock = false;

    const checker = new DriverAvailabilityChecker(mockAvailabilitySource);
    useCase = new SuspendDriverUseCase(
      driversRepository,
      suspensionsRepository,
      checker,
    );
  });

  it('should successfully suspend a driver when driver is active and has no active trip', async () => {
    const driver = new Driver({
      name: 'Carlos Alberto',
      cpf: new Cpf('12345678909'),
      cnh: new Cnh('12345678900', 'D', new Date('2028-10-01')),
      ownerId: 'owner-1',
      status: DriverStatus.ACTIVE,
    });
    await driversRepository.create(driver);

    const suspension = await useCase.execute({
      driverId: driver.getId(),
      ownerId: 'owner-1',
      suspendedBy: 'user-manager-1',
      reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
      expectedReturnDate: new Date('2026-10-15'),
      indefinite: false,
    });

    expect(suspension.getId()).toBeDefined();
    expect(suspension.getDriverId()).toBe(driver.getId());
    expect(suspension.getStatus()).toBe(SuspensionStatus.ATIVA);

    const updatedDriver = await driversRepository.findById(driver.getId());
    expect(updatedDriver?.getStatus()).toBe(DriverStatus.SUSPENDED);

    const savedSuspension = await suspensionsRepository.findActiveByDriverId(driver.getId());
    expect(savedSuspension).toBeDefined();
  });

  it('should throw DriverAlreadySuspendedException if driver is already suspended', async () => {
    const driver = new Driver({
      name: 'Carlos Alberto',
      cpf: new Cpf('12345678909'),
      cnh: new Cnh('12345678900', 'D', new Date('2028-10-01')),
      ownerId: 'owner-1',
      status: DriverStatus.SUSPENDED,
    });
    await driversRepository.create(driver);

    await expect(
      useCase.execute({
        driverId: driver.getId(),
        ownerId: 'owner-1',
        suspendedBy: 'user-manager-1',
        reasonCategory: SuspensionReasonCategory.ACIDENTE,
        indefinite: true,
      }),
    ).rejects.toThrow(DriverAlreadySuspendedException);
  });

  it('should throw DriverHasActiveTripException if driver is currently in an active trip', async () => {
    const driver = new Driver({
      name: 'Carlos Alberto',
      cpf: new Cpf('12345678909'),
      cnh: new Cnh('12345678900', 'D', new Date('2028-10-01')),
      ownerId: 'owner-1',
      status: DriverStatus.ACTIVE,
    });
    await driversRepository.create(driver);

    hasActiveTripMock = true;

    await expect(
      useCase.execute({
        driverId: driver.getId(),
        ownerId: 'owner-1',
        suspendedBy: 'user-manager-1',
        reasonCategory: SuspensionReasonCategory.PROCESSO_DISCIPLINAR,
        indefinite: true,
      }),
    ).rejects.toThrow(DriverHasActiveTripException);
  });

  it('should throw DriverNotFoundException if driver does not exist', async () => {
    await expect(
      useCase.execute({
        driverId: 'non-existing-driver',
        ownerId: 'owner-1',
        suspendedBy: 'user-manager-1',
        reasonCategory: SuspensionReasonCategory.OUTRO,
        reasonDetails: 'Motivo qualquer',
        indefinite: true,
      }),
    ).rejects.toThrow(DriverNotFoundException);
  });
});
