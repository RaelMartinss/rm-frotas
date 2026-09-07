export class FuelRecordNotFoundException extends Error {
  constructor(message: string = 'Registro de abastecimento não encontrado.') {
    super(message);
    this.name = 'FuelRecordNotFoundException';
  }
}

export class InvalidFuelAmountException extends Error {
  constructor(message: string = 'A quantidade de litros deve ser maior que zero.') {
    super(message);
    this.name = 'InvalidFuelAmountException';
  }
}

export class InvalidFuelCostException extends Error {
  constructor(message: string = 'O valor total do abastecimento deve ser maior que zero.') {
    super(message);
    this.name = 'InvalidFuelCostException';
  }
}

export class DriverNotAssignedToVehicleException extends Error {
  constructor(message: string = 'O motorista não possui autorização ou vínculo com este veículo.') {
    super(message);
    this.name = 'DriverNotAssignedToVehicleException';
  }
}

export class UnauthorizedFuelRecordAccessException extends Error {
  constructor(message: string = 'Acesso não autorizado a este registro de abastecimento.') {
    super(message);
    this.name = 'UnauthorizedFuelRecordAccessException';
  }
}
