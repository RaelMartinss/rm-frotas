import { Driver } from '../../domain/entities/driver.entity';
import {
  IDriversRepository,
  FindManyDriversPaginatedParams,
  FindManyDriversPaginatedOutput,
} from '../../domain/repositories/drivers.repository';
import { Cpf } from '../../domain/value-objects/cpf.vo';

export class InMemoryDriversRepository implements IDriversRepository {
  public items: Driver[] = [];

  async create(driver: Driver): Promise<void> {
    this.items.push(driver);
  }

  async findById(id: string): Promise<Driver | null> {
    const driver = this.items.find((item) => item.getId() === id);
    return driver ?? null;
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    const driver = this.items.find((item) => item.getUserId() === userId);
    return driver ?? null;
  }

  async findByCpf(cpf: Cpf): Promise<Driver | null> {
    const driver = this.items.find(
      (item) => item.getCpf()?.getValue() === cpf.getValue(),
    );
    return driver ?? null;
  }

  findAll(ownerId?: string): Promise<Driver[]> {
    if (ownerId) {
      return Promise.resolve(this.items.filter((item) => item.getOwnerId() === ownerId));
    }
    return Promise.resolve(this.items);
  }

  async findManyPaginated({
    ownerId,
    status,
    search,
    page,
    limit,
  }: FindManyDriversPaginatedParams): Promise<FindManyDriversPaginatedOutput> {
    let filtered = this.items;

    if (ownerId) {
      filtered = filtered.filter((d) => d.getOwnerId() === ownerId);
    }

    if (status) {
      filtered = filtered.filter((d) => d.getStatus() === status);
    }

    if (search && search.trim()) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter((d) =>
        d.getName().toLowerCase().includes(term) ||
        (d.getCpf() && d.getCpf().getValue().toLowerCase().includes(term)) ||
        (d.getCnh() && d.getCnh().getNumber().toLowerCase().includes(term))
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const drivers = filtered.slice(start, start + limit);

    return {
      drivers,
      total,
    };
  }

  async save(driver: Driver): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === driver.getId());

    if (index >= 0) {
      this.items[index] = driver;
    } else {
      this.items.push(driver);
    }
  }
}