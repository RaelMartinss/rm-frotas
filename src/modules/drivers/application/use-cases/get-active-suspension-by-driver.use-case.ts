import { Injectable, Inject } from '@nestjs/common';
import type { IDriverSuspensionsRepository } from '../../domain/repositories/driver-suspensions.repository';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { DriverSuspension } from '../../domain/entities/driver-suspension.entity';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';

export interface GetActiveSuspensionInput {
  driverId: string;
  ownerId: string;
}

@Injectable()
export class GetActiveSuspensionByDriverUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IDriverSuspensionsRepository')
    private readonly driverSuspensionsRepository: IDriverSuspensionsRepository,
  ) {}

  async execute(input: GetActiveSuspensionInput): Promise<DriverSuspension | null> {
    const driver = await this.driversRepository.findById(input.driverId);

    if (!driver) {
      throw new DriverNotFoundException(input.driverId);
    }

    if (driver.getOwnerId() && driver.getOwnerId() !== input.ownerId) {
      throw new DriverNotFoundException(input.driverId);
    }

    return this.driverSuspensionsRepository.findActiveByDriverId(input.driverId);
  }
}
