export interface CreateVehicleInput {
    plate: string;
    renavam?: string;
    brand?: string;
    model: string;
    year: number;
    currentKm: number;
    crlvExpiration?: string;
    clientId?: string;
    ownerId?: string;
}