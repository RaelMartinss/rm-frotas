import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Vehicle } from "../../../domain/entities/vehicle.entity";
import { IVehiclesRepository } from "../../../domain/repositories/vehicles.repository";
import { LicensePlate } from "../../../domain/value-objects/license-plate.vo";
import { UpdateVehicleKmUseCase } from "../update-vehicle-km.use-case";

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

    async findById(id: string): Promise<Vehicle | null> {
        return this.items.find((item) => item.getId() === id) ?? null;
    }

    async findByPlate(plate: string): Promise<Vehicle | null> {
        return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
    }

    async findAll(): Promise<Vehicle[]> {
        return this.items;
    }
}

describe('Update Vehicle Km Case', () => {
    let sut: UpdateVehicleKmUseCase;
    let repository: InMemoryVehiclesRepository;

    beforeAll(() => {
        repository = new InMemoryVehiclesRepository();
        sut = new UpdateVehicleKmUseCase(repository);
    });

    it('deve atualizar a quilometragem do veículo com sucesso', async () => {
        const vehicle = new Vehicle({
            plate: new LicensePlate('ABC1234'),
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 10000,
        });

        await repository.save(vehicle);

        const result = await sut.execute({
            vehicleId: vehicle.getId(),
            currentKm: 15000,
        });

        expect(result.getCurrentKm()).toBe(15000);
        expect(repository.items[0].getCurrentKm()).toBe(15000);
    });

    it('deve lança NotFoundException quando veículo não for encontrado', async () => {
        await expect(
            sut.execute({
                vehicleId: 'no-existing-id',
                currentKm: 20000,
            }),
        ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se a nova quilometragem for menor que a atual', async () => {
        const vehicle = new Vehicle({
            plate: new LicensePlate('ABC1234'),
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 50000,
        });

        await repository.save(vehicle);

        await expect(
            sut.execute({
                vehicleId: vehicle.getId(),
                currentKm: 40000,
            }),
        ).rejects.toThrow(BadRequestException);
    })
})