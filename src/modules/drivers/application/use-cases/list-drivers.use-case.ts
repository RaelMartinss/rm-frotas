import { Injectable, Inject } from '@nestjs/common';
import type { IDriversRepository } from '../../domain/repositories/drivers.repository';
import { Driver, DriverStatus } from '../../domain/entities/driver.entity';

export interface ListDriversInput {
  ownerId?: string;
  status?: DriverStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListDriversOutput {
  data: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListDriversUseCase {
  constructor(
    @Inject('IDriversRepository')
    private readonly driversRepository: IDriversRepository,
  ) {}

  async execute(input: ListDriversInput = {}): Promise<ListDriversOutput> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { drivers, total } = await this.driversRepository.findManyPaginated({
      ownerId: input.ownerId,
      status: input.status,
      search: input.search,
      page,
      limit,
    });

    return {
      data: drivers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
