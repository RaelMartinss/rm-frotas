import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver } from '../../domain/entities/driver.entity';
import { Cnh } from '../../domain/value-objects/cnh.vo';
import { UpdateDriverCnhInputDto } from '../dtos/update-driver-cnh.dto';
import { DriverNotFoundException } from '../../domain/exceptions/driver-not-found.exception';

@Injectable()
export class UpdateDriverCnhUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(input: UpdateDriverCnhInputDto): Promise<Driver> {
    const driver = await this.driversRepository.findById(input.driverId);

    if (!driver) {
      throw new DriverNotFoundException(input.driverId);
    }

    const newCnh = new Cnh(
      input.cnhNumber,
      input.cnhCategory,
      input.cnhExpirationDate,
    );

    driver.updateCnh(newCnh);
    await this.driversRepository.save(driver);

    return driver;
  }
}