import { Vehicle } from "../../../domain/entities/vehicle.entity";


export class VehiclePresenter {
    static toHTTP(vehicle: Vehicle) {
        return {
            id: vehicle.getId(),
            plate: vehicle.getPlate().getValue(),
            brand: vehicle.getBrand(),
            model: vehicle.getModel(),
            year: vehicle.getYear(),
            currentKm: vehicle.getCurrentKm(),
            crlvExpiration: vehicle.getCrlvExpiration()?.toISOString().split('T')[0] ?? null,
            status: vehicle.getStatus(),
            createdAt: vehicle.getCreatedAt(),
            updatedAt: vehicle.getUpdatedAt(),
        }
    }
}