import { Vehicle } from "../../domain/entities/vehicle.entity";
import {
  IVehiclesRepository,
  FindManyVehiclesPaginatedParams,
  FindManyVehiclesPaginatedOutput,
} from "../../domain/repositories/vehicles.repository";

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

  async createMany(vehicles: Vehicle[]): Promise<void> {
    this.items.push(...vehicles);
  }

  async findExistingPlates(plates: string[]): Promise<string[]> {
    const platesUpper = plates.map((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    return this.items
      .filter((v) => platesUpper.includes(v.getPlate().getValue().toUpperCase()))
      .map((v) => v.getPlate().getValue());
  }

  async findById(id: string): Promise<Vehicle | null> {
    const vehicle = this.items.find((item) => item.getId() === id);
    return vehicle ?? null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
  }

  async findAll(ownerId?: string): Promise<Vehicle[]> {
    if (ownerId) {
      return this.items.filter((item) => item.getOwnerId() === ownerId);
    }
    return this.items;
  }

  async findManyPaginated({
    ownerId,
    status,
    search,
    page,
    limit,
  }: FindManyVehiclesPaginatedParams): Promise<FindManyVehiclesPaginatedOutput> {
    let filtered = this.items;

    if (ownerId) {
      filtered = filtered.filter((v) => v.getOwnerId() === ownerId);
    }

    if (status) {
      filtered = filtered.filter((v) => v.getStatus() === status);
    }

    if (search && search.trim()) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter((v) =>
        v.getPlate().getValue().toLowerCase().includes(term) ||
        v.getModel().toLowerCase().includes(term) ||
        (v.getBrand() && v.getBrand()!.toLowerCase().includes(term))
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const vehicles = filtered.slice(start, start + limit);

    return {
      vehicles,
      total,
    };
  }
}
