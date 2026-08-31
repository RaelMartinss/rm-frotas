export class VehicleAlreadyExistsException extends Error {
    constructor(plate: string) {
        super(`Veículo com placa '${plate}' já está cadastrado.`);
        this.name = 'VehicleAlreadyExistsException';
    }
}