export class VehicleNotFoundException extends Error {
    constructor(vehicleId: string){
        super(`Veículo '${vehicleId}' não encontrado`)
        this.name = 'VehicleNotFoundException'
    }
}