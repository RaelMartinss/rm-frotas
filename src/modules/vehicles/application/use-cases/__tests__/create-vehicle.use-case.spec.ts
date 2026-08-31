import { describe, it, expect, beforeEach } from 'vitest';
import { CreateVehicleUseCase } from '../create-vehicle.use-case';
import { IVehiclesRepository } from '../../../domain/repositories/vehicles.repository';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { VehicleAlreadyExistsException } from '../../../domain/exceptions/vehicle-already-exists.exception';

// Implementation Fake (In-Memory) apenas para os testes unitários
class InMemoryVehiclesRepository implements IVehiclesRepository {
  public items: Vehicle[] = [];

  async save(vehicle: Vehicle): Promise<void> {
    this.items.push(vehicle);
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
  }
}

describe('CreateVehicleUseCase', () => {
  let repository: InMemoryVehiclesRepository;
  let useCase: CreateVehicleUseCase;

  beforeEach(() => {
    repository = new InMemoryVehiclesRepository();
    useCase = new CreateVehicleUseCase(repository);
  });

  it('deve criar um novo veículo com sucesso', async () => {
    const vehicle = await useCase.execute({
      plate: 'ABC-1234',
      model: 'Volvo FH 540',
      year: 2023,
      currentKm: 1000,
    });

    expect(vehicle.getId()).toBeDefined();
    expect(vehicle.getPlate().getValue()).toBe('ABC1234');
    expect(repository.items).toHaveLength(1);
  });

  it('não deve permitir cadastrar veículo com placa duplicada', async () => {
    await useCase.execute({
      plate: 'ABC-1234',
      model: 'Volvo FH 540',
      year: 2023,
      currentKm: 1000,
    });

    await expect(
      useCase.execute({
        plate: 'ABC-1234',
        model: 'Scania R450',
        year: 2022,
        currentKm: 5000,
      }),
    ).rejects.toThrow(VehicleAlreadyExistsException);
  });
});