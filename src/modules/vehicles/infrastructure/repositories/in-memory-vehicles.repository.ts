import { Vehicle } from "../../domain/entities/vehicle.entity";
import { IVehiclesRepository } from "../../domain/repositories/vehicles.repository";


export class InMemoryVehiclesRepository implements IVehiclesRepository {
  public items: Vehicle[] = [];

  async create(vehicle: Vehicle): Promise<void> {
    this.items.push(vehicle);
  }

  async save(vehicle: Vehicle): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === vehicle.getId());
    if (index >= 0) {
      this.items[index] = vehicle;
    } else {
      this.items.push(vehicle);
    }
  }

  async findById(id: string): Promise<Vehicle | null> {
    const vehicle = this.items.find((item) => item.getId() === id);
    return vehicle ?? null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
  }

  async findAll(): Promise<Vehicle[]> {
    return this.items;
  }
}
