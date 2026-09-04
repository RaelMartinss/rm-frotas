import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver } from '../../domain/entities/driver.entity';

@Injectable()
export class ListDriversUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(): Promise<Driver[]> {
    return this.driversRepository.findAll();
  }
}
