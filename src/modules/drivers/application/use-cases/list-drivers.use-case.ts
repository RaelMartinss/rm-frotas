import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver } from '../../domain/entities/driver.entity';

@Injectable()
export class ListDriversUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(ownerId?: string): Promise<Driver[]> {
    return this.driversRepository.findAll(ownerId);
  }
}
