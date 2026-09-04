import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';

@Injectable()
export class FindDriverByIdUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new DriverNotFoundException(id);
    }
    return driver;
  }
}
