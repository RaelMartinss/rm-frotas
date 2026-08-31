import { Vehicle } from "../../../domain/entities/vehicle.entity";


export class VehiclePresenter {
    static toHTTP(vehicle: Vehicle) {
        return {
            id: vehicle.getId(),
            plate: vehicle.getPlate().getValue(),
            model: vehicle.getModel(),
            year: vehicle.getYear(),
            currentKm: vehicle.getCurrentKm(),
            status: vehicle.getStatus(),
            createdAt: vehicle.getCreatedAt(),
            updatedAt: vehicle.getUpdatedAt(),
        }
    }
}