import {
  DriverSuspension as PrismaDriverSuspension,
  SuspensionReasonCategory as PrismaSuspensionReasonCategory,
  SuspensionStatus as PrismaSuspensionStatus,
} from '@prisma/client';
import {
  DriverSuspension,
  SuspensionReasonCategory,
  SuspensionStatus,
} from '../../domain/entities/driver-suspension.entity';

export class DriverSuspensionMapper {
  static toDomain(raw: PrismaDriverSuspension): DriverSuspension {
    return new DriverSuspension(
      {
        driverId: raw.driverId,
        ownerId: raw.ownerId,
        reasonCategory: raw.reasonCategory as SuspensionReasonCategory,
        reasonDetails: raw.reasonDetails,
        suspendedBy: raw.suspendedBy,
        suspendedAt: raw.suspendedAt,
        expectedReturnDate: raw.expectedReturnDate,
        indefinite: raw.indefinite,
        attachmentUrl: raw.attachmentUrl,
        liftedAt: raw.liftedAt,
        liftedBy: raw.liftedBy,
        liftReason: raw.liftReason,
        status: raw.status as SuspensionStatus,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  static toPrisma(suspension: DriverSuspension): PrismaDriverSuspension {
    return {
      id: suspension.getId(),
      driverId: suspension.getDriverId(),
      ownerId: suspension.getOwnerId(),
      reasonCategory:
        suspension.getReasonCategory() as PrismaSuspensionReasonCategory,
      reasonDetails: suspension.getReasonDetails(),
      suspendedBy: suspension.getSuspendedBy(),
      suspendedAt: suspension.getSuspendedAt(),
      expectedReturnDate: suspension.getExpectedReturnDate(),
      indefinite: suspension.isIndefinite(),
      attachmentUrl: suspension.getAttachmentUrl(),
      liftedAt: suspension.getLiftedAt(),
      liftedBy: suspension.getLiftedBy(),
      liftReason: suspension.getLiftReason(),
      status: suspension.getStatus() as PrismaSuspensionStatus,
      createdAt: suspension.getCreatedAt(),
      updatedAt: suspension.getUpdatedAt(),
    };
  }
}
