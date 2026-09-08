import { NotFoundException } from "@nestjs/common";
import { Vehicle } from "../../../domain/entities/vehicle.entity";
import { IVehiclesRepository } from "../../../domain/repositories/vehicles.repository";
import { LicensePlate } from "../../../domain/value-objects/license-plate.vo";
import { UpdateVehicleCrlvUseCase } from "../update-vehicle-crlv.use-case";

class InMemoryVehiclesRepository implements IVehiclesRepository {
    public items: Vehicle[] = []

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

    async findById(id: string): Promise<Vehicle | null> {
        return this.items.find((item) => item.getId() === id) ?? null;
    }

    async findByPlate(plate: string): Promise<Vehicle | null> {
        return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
    }

    async findExistingPlates(plates: string[]): Promise<string[]> {
        return this.items
            .filter((item) => plates.includes(item.getPlate().getValue()))
            .map((item) => item.getPlate().getValue());
    }

    async findAll(): Promise<Vehicle[]> {
        return this.items;
    }

    async findManyPaginated(): Promise<{ vehicles: Vehicle[]; total: number }> {
        return { vehicles: this.items, total: this.items.length };
    }
}

describe('Update Vehicle CRLV Use Case', () => {
    let sut: UpdateVehicleCrlvUseCase;
    let repository: InMemoryVehiclesRepository;

    beforeEach(() => {
        repository = new InMemoryVehiclesRepository();
        sut = new UpdateVehicleCrlvUseCase(repository);
    });

    it('deve atualizar o vencimento do CRLV do veículo com sucesso', async () => {
        const vehicle = new Vehicle({
            plate: new LicensePlate('ABC1234'),
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 10000,
            crlvExpiration: new Date('2025-01-01'),
        });

        await repository.save(vehicle);

        const newDate = '2027-12-31';
        const result = await sut.execute({
            vehicleId: vehicle.getId(),
            crlvExpiration: newDate,
        });

        expect(result.getCrlvExpiration()).toEqual(new Date(newDate));
        expect(repository.items[0].getCrlvExpiration()).toEqual(new Date(newDate));
    });

    it('deve lançar NotFoundException quando veículo não for encontrado', async () => {
        await expect(
            sut.execute({
                vehicleId: 'non-existing-id',
                crlvExpiration: '2027-12-31',
            }),
        ).rejects.toThrow(NotFoundException);
    });
});
