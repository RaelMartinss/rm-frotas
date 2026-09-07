import { DriverSuspension } from '../../../domain/entities/driver-suspension.entity';
import { DriverSuspensionWithDriverDetails } from '../../../domain/repositories/driver-suspensions.repository';

export class DriverSuspensionPresenter {
  static toHTTP(suspension: DriverSuspension) {
    return {
      id: suspension.getId(),
      driverId: suspension.getDriverId(),
      ownerId: suspension.getOwnerId(),
      reasonCategory: suspension.getReasonCategory(),
      reasonDetails: suspension.getReasonDetails(),
      suspendedBy: suspension.getSuspendedBy(),
      suspendedAt: suspension.getSuspendedAt().toISOString(),
      expectedReturnDate: suspension.getExpectedReturnDate()
        ? suspension.getExpectedReturnDate()?.toISOString().split('T')[0]
        : null,
      indefinite: suspension.isIndefinite(),
      attachmentUrl: suspension.getAttachmentUrl(),
      liftedAt: suspension.getLiftedAt()
        ? suspension.getLiftedAt()?.toISOString()
        : null,
      liftedBy: suspension.getLiftedBy(),
      liftReason: suspension.getLiftReason(),
      status: suspension.getStatus(),
      createdAt: suspension.getCreatedAt().toISOString(),
      updatedAt: suspension.getUpdatedAt().toISOString(),
    };
  }

  static toHTTPWithDriver(item: DriverSuspensionWithDriverDetails) {
    return {
      ...DriverSuspensionPresenter.toHTTP(item.suspension),
      driverName: item.driverName,
      driverCpf: item.driverCpf,
    };
  }
}
