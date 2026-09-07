import { Injectable, Inject } from '@nestjs/common';
import type { IDriverSuspensionsRepository } from '../../domain/repositories/driver-suspensions.repository';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { DriverSuspension } from '../../domain/entities/driver-suspension.entity';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';

export interface ListSuspensionsByDriverInput {
  driverId: string;
  ownerId: string;
  page?: number;
  limit?: number;
}

export interface ListSuspensionsByDriverOutput {
  data: DriverSuspension[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListSuspensionsByDriverUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
    @Inject('IDriverSuspensionsRepository')
    private readonly driverSuspensionsRepository: IDriverSuspensionsRepository,
  ) {}

  async execute(input: ListSuspensionsByDriverInput): Promise<ListSuspensionsByDriverOutput> {
    const driver = await this.driversRepository.findById(input.driverId);

    if (!driver) {
      throw new DriverNotFoundException(input.driverId);
    }

    if (driver.getOwnerId() && driver.getOwnerId() !== input.ownerId) {
      throw new DriverNotFoundException(input.driverId);
    }

    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { suspensions, total } =
      await this.driverSuspensionsRepository.findAllByDriverId(input.driverId, {
        page,
        limit,
      });

    return {
      data: suspensions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
