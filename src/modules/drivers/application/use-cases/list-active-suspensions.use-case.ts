import { Injectable, Inject } from '@nestjs/common';
import type {
  IDriverSuspensionsRepository,
  DriverSuspensionWithDriverDetails,
} from '../../domain/repositories/driver-suspensions.repository';

export interface ListActiveSuspensionsInput {
  ownerId: string;
  page?: number;
  limit?: number;
}

export interface ListActiveSuspensionsOutput {
  data: DriverSuspensionWithDriverDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListActiveSuspensionsUseCase {
  constructor(
    @Inject('IDriverSuspensionsRepository')
    private readonly driverSuspensionsRepository: IDriverSuspensionsRepository,
  ) {}

  async execute(input: ListActiveSuspensionsInput): Promise<ListActiveSuspensionsOutput> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { suspensions, total } =
      await this.driverSuspensionsRepository.findAllActiveByOwnerId(input.ownerId, {
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
