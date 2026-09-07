import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import type { IDriverSuspensionsRepository } from '../../domain/repositories/driver-suspensions.repository';
import { DriverAvailabilityChecker } from '../../domain/services/driver-availability-checker.service';
import {
  DriverSuspension,
  SuspensionReasonCategory,
} from '../../domain/entities/driver-suspension.entity';
import { DriverStatus } from '../../domain/entities/driver-status.enum';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';
import { DriverAlreadySuspendedException } from '../../domain/exceptions/driver-already-suspended.exception';
import { DriverHasActiveTripException } from '../../domain/exceptions/driver-has-active-trip.exception';

export interface SuspendDriverInput {
  driverId: string;
  ownerId: string;
  suspendedBy: string;
  reasonCategory: SuspensionReasonCategory;
  reasonDetails?: string | null;
  expectedReturnDate?: Date | null;
  indefinite?: boolean;
  attachmentUrl?: string | null;
}

@Injectable()
export class SuspendDriverUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IDriverSuspensionsRepository')
    private readonly driverSuspensionsRepository: IDriverSuspensionsRepository,
    private readonly driverAvailabilityChecker: DriverAvailabilityChecker,
  ) {}

  async execute(input: SuspendDriverInput): Promise<DriverSuspension> {
    // 1. Busca motorista e valida existência e tenant
    const driver = await this.driversRepository.findById(input.driverId);

    if (!driver) {
      throw new DriverNotFoundException(input.driverId);
    }

    if (driver.getOwnerId() && driver.getOwnerId() !== input.ownerId) {
      throw new DriverNotFoundException(input.driverId);
    }

    // 2. Valida se o motorista já está suspenso
    if (driver.getStatus() === DriverStatus.SUSPENDED) {
      throw new DriverAlreadySuspendedException(input.driverId);
    }

    const activeSuspension =
      await this.driverSuspensionsRepository.findActiveByDriverId(input.driverId);
    if (activeSuspension) {
      throw new DriverAlreadySuspendedException(input.driverId);
    }

    // 3. Valida se o motorista possui viagem em andamento
    const hasActiveTrip = await this.driverAvailabilityChecker.hasActiveTrip(
      input.driverId,
    );
    if (hasActiveTrip) {
      throw new DriverHasActiveTripException(input.driverId);
    }

    // 4. Cria a entidade de Suspensão com validações de domínio
    const suspension = new DriverSuspension({
      driverId: input.driverId,
      ownerId: input.ownerId,
      reasonCategory: input.reasonCategory,
      reasonDetails: input.reasonDetails,
      suspendedBy: input.suspendedBy,
      expectedReturnDate: input.expectedReturnDate,
      indefinite: input.indefinite,
      attachmentUrl: input.attachmentUrl,
    });

    // 5. Altera o status do motorista para SUSPENDED
    driver.suspend();

    // 6. Persiste a suspensão e atualiza o motorista
    await this.driverSuspensionsRepository.create(suspension);
    await this.driversRepository.save(driver);

    return suspension;
  }
}