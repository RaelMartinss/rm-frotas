import { NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Vehicle, VehicleStatus } from "../../../domain/entities/vehicle.entity";
import { IVehiclesRepository } from "../../../domain/repositories/vehicles.repository";
import { LicensePlate } from "../../../domain/value-objects/license-plate.vo";
import { FindVehicleByIdUseCase } from "../find-vehicle-by-id.use-case";
import { FinishVehicleMaintenanceUseCase } from "../finish-vehicle-maintenance.use-case";

class InMemoryVehiclesRepository implements IVehiclesRepository {
    public items: Vehicle[] = [];
    
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
        return this.items.find((item) => item.getPlate().getValue() === plate) ?? null
    }

    async findAll(): Promise<Vehicle[]> {
        return this.items;
    }
}

describe('Finish vehicle main tenance use case', () => {
    let sut: FinishVehicleMaintenanceUseCase;
    let repository: InMemoryVehiclesRepository;

    beforeEach(() => {
        repository = new InMemoryVehiclesRepository();
        sut = new FinishVehicleMaintenanceUseCase(repository);
    });

    it('deve finalizar a manutenção do veículo e alterar seu status para AVAILABLE', async () => {
        const vehicle = new Vehicle({
            plate: new LicensePlate('ABC1234'),
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 15000,
            status: VehicleStatus.IN_MAINTENANCE,
        });

        await repository.save(vehicle);

        const result = await sut.execute({ vehicleId: vehicle.getId() });

        expect(result.getStatus()).toBe(VehicleStatus.AVAILABLE);
        expect(repository.items[0].getStatus()).toBe(VehicleStatus.AVAILABLE);
    });

    it('deve lançar NotFoundException se o veículo não for encontrado', async () => {
        await expect(
            sut.execute({ vehicleId: 'no-existing-id' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar UnprocessableEntityException se o veículo não estiver em manutenção',   async () => {
        const vehicle = new Vehicle({
            plate: new LicensePlate('ABC1234'),
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 15000,
            status: VehicleStatus.AVAILABLE, // Já está disponível, não está em manutenção
        });

        await repository.save(vehicle);

        await expect(
            sut.execute({ vehicleId: vehicle.getId() }),
        ).rejects.toThrow(UnprocessableEntityException);
    });
})