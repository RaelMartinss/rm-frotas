import { Driver } from '../../domain/entities/driver.entity';
import { IDriversRepository } from '../../domain/repositories/drivers.repository';
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

  async findByCpf(cpf: Cpf): Promise<Driver | null> {
    const driver = this.items.find(
      (item) => item.getCpf()?.getValue() === cpf.getValue(),
    );
    return driver ?? null;
  }

  findAll(): Promise<Driver[]> {
    return Promise.resolve(this.items);
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