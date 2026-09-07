import {
  IDriverSuspensionsRepository,
  FindDriverSuspensionsPaginatedParams,
  DriverSuspensionWithDriverDetails,
} from '../../domain/repositories/driver-suspensions.repository';
import {
  DriverSuspension,
  SuspensionStatus,
} from '../../domain/entities/driver-suspension.entity';

export class InMemoryDriverSuspensionsRepository
  implements IDriverSuspensionsRepository
{
  public items: DriverSuspension[] = [];

  async create(suspension: DriverSuspension): Promise<void> {
    this.items.push(suspension);
  }

  async save(suspension: DriverSuspension): Promise<void> {
    const index = this.items.findIndex((i) => i.getId() === suspension.getId());
    if (index !== -1) {
      this.items[index] = suspension;
    } else {
      this.items.push(suspension);
    }
  }

  async findById(id: string): Promise<DriverSuspension | null> {
    const item = this.items.find((i) => i.getId() === id);
    return item ?? null;
  }

  async findActiveByDriverId(driverId: string): Promise<DriverSuspension | null> {
    const item = this.items.find(
      (i) =>
        i.getDriverId() === driverId &&
        i.getStatus() === SuspensionStatus.ATIVA,
    );
    return item ?? null;
  }

  async findAllByDriverId(
    driverId: string,
    params: FindDriverSuspensionsPaginatedParams,
  ): Promise<{ suspensions: DriverSuspension[]; total: number }> {
    const filtered = this.items
      .filter((i) => i.getDriverId() === driverId)
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());

    const skip = (params.page - 1) * params.limit;
    const paginated = filtered.slice(skip, skip + params.limit);

    return {
      suspensions: paginated,
      total: filtered.length,
    };
  }

  async findAllActiveByOwnerId(
    ownerId: string,
    params: FindDriverSuspensionsPaginatedParams,
  ): Promise<{
    suspensions: DriverSuspensionWithDriverDetails[];
    total: number;
  }> {
    const filtered = this.items
      .filter(
        (i) =>
          i.getOwnerId() === ownerId &&
          i.getStatus() === SuspensionStatus.ATIVA,
      )
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());

    const skip = (params.page - 1) * params.limit;
    const paginated = filtered.slice(skip, skip + params.limit);

    return {
      suspensions: paginated.map((suspension) => ({
        suspension,
        driverName: 'Motorista Teste',
        driverCpf: '12345678900',
      })),
      total: filtered.length,
    };
  }
}
