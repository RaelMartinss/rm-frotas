export  class VehicleAlreadyInMaintenanceException extends Error {
    constructor() {
        super('O veículo já está em manutenção.');
        this.name = 'VehicleAlreadyInMaintenanceException';
    }
}

export class VehicleInUseException extends Error {
  constructor() {
    super('Não é possível enviar um veículo em uso para a manutenção.');
    this.name = 'VehicleInUseException';
  }
}

export class VehicleNotInMaintenanceException extends Error {
  constructor() {
    super('O veículo não está em manutenção para ter a manutenção finalizada.');
    this.name = 'VehicleNotInMaintenanceException';
  }
}