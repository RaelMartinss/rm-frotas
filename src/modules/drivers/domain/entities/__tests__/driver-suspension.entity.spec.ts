import {
  DriverSuspension,
  SuspensionReasonCategory,
  SuspensionStatus,
} from '../driver-suspension.entity';
import { InvalidSuspensionReasonException } from '../../exceptions/invalid-suspension-reason.exception';
import { InvalidSuspensionDateRangeException } from '../../exceptions/invalid-suspension-date-range.exception';
import { SuspensionAlreadyLiftedException } from '../../exceptions/suspension-already-lifted.exception';

describe('DriverSuspension Entity', () => {
  const baseProps = {
    driverId: 'driver-uuid-1',
    ownerId: 'owner-uuid-1',
    reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
    suspendedBy: 'user-manager-1',
    expectedReturnDate: new Date('2026-10-01'),
    indefinite: false,
  };

  it('should instantiate a valid DriverSuspension with status ATIVA', () => {
    const suspension = new DriverSuspension(baseProps);

    expect(suspension.getId()).toBeDefined();
    expect(suspension.getDriverId()).toBe('driver-uuid-1');
    expect(suspension.getOwnerId()).toBe('owner-uuid-1');
    expect(suspension.getReasonCategory()).toBe(SuspensionReasonCategory.CNH_VENCIDA);
    expect(suspension.getStatus()).toBe(SuspensionStatus.ATIVA);
    expect(suspension.isActive()).toBe(true);
    expect(suspension.getLiftedAt()).toBeNull();
    expect(suspension.isIndefinite()).toBe(false);
  });

  it('should allow creating an indefinite suspension when expectedReturnDate is null', () => {
    const suspension = new DriverSuspension({
      ...baseProps,
      indefinite: true,
      expectedReturnDate: null,
    });

    expect(suspension.isIndefinite()).toBe(true);
    expect(suspension.getExpectedReturnDate()).toBeNull();
  });

  it('should throw InvalidSuspensionReasonException when reasonCategory is OUTRO and reasonDetails is missing', () => {
    expect(() => {
      new DriverSuspension({
        ...baseProps,
        reasonCategory: SuspensionReasonCategory.OUTRO,
        reasonDetails: '',
      });
    }).toThrow(InvalidSuspensionReasonException);
  });

  it('should throw InvalidSuspensionDateRangeException when indefinite is true but expectedReturnDate is provided', () => {
    expect(() => {
      new DriverSuspension({
        ...baseProps,
        indefinite: true,
        expectedReturnDate: new Date('2026-10-01'),
      });
    }).toThrow(InvalidSuspensionDateRangeException);
  });

  it('should throw InvalidSuspensionDateRangeException when indefinite is false and expectedReturnDate is missing', () => {
    expect(() => {
      new DriverSuspension({
        ...baseProps,
        indefinite: false,
        expectedReturnDate: null,
      });
    }).toThrow(InvalidSuspensionDateRangeException);
  });

  it('should successfully lift an active suspension', () => {
    const suspension = new DriverSuspension(baseProps);
    const liftDate = new Date();

    suspension.lift({
      liftedBy: 'user-manager-2',
      liftReason: 'CNH renovada e regularizada',
      liftedAt: liftDate,
    });

    expect(suspension.getStatus()).toBe(SuspensionStatus.ENCERRADA);
    expect(suspension.isActive()).toBe(false);
    expect(suspension.getLiftedBy()).toBe('user-manager-2');
    expect(suspension.getLiftReason()).toBe('CNH renovada e regularizada');
    expect(suspension.getLiftedAt()).toEqual(liftDate);
  });

  it('should throw SuspensionAlreadyLiftedException when trying to lift an already lifted suspension', () => {
    const suspension = new DriverSuspension(baseProps);
    suspension.lift({ liftedBy: 'user-manager-1' });

    expect(() => {
      suspension.lift({ liftedBy: 'user-manager-1' });
    }).toThrow(SuspensionAlreadyLiftedException);
  });

  it('should throw InvalidSuspensionDateRangeException when liftedAt is before suspendedAt', () => {
    const suspendedAt = new Date('2026-09-07T12:00:00Z');
    const suspension = new DriverSuspension({
      ...baseProps,
      suspendedAt,
    });

    const earlierDate = new Date('2026-09-06T12:00:00Z');

    expect(() => {
      suspension.lift({
        liftedBy: 'user-manager-1',
        liftedAt: earlierDate,
      });
    }).toThrow(InvalidSuspensionDateRangeException);
  });
});
