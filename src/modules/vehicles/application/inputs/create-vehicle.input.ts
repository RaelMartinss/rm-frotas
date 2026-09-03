export interface CreateVehicleInput {
    plate: string;
    model: string;
    year: number;
    currentKm: number;
    ownerId?: string;
}