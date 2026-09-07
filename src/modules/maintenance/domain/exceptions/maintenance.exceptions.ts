export class MaintenanceAlreadyFinishedException extends Error {
  constructor() {
    super('A manutenção já foi concluída ou cancelada e não pode ser modificada.');
    this.name = 'MaintenanceAlreadyFinishedException';
  }
}

export class MaintenanceNotInProgressException extends Error {
  constructor() {
    super('A manutenção deve estar em andamento para ser finalizada.');
    this.name = 'MaintenanceNotInProgressException';
  }
}

export class MaintenanceNotScheduledException extends Error {
  constructor() {
    super('A manutenção precisa estar agendada para ser iniciada.');
    this.name = 'MaintenanceNotScheduledException';
  }
}

export class InvalidOdometerReadingException extends Error {
  constructor(message = 'O odômetro informado não pode ser menor que a quilometragem atual do veículo.') {
    super(message);
    this.name = 'InvalidOdometerReadingException';
  }
}

export class MaintenanceNotFoundException extends Error {
  constructor() {
    super('Manutenção não encontrada.');
    this.name = 'MaintenanceNotFoundException';
  }
}

export class VehicleAlreadyInMaintenanceException extends Error {
  constructor() {
    super('O veículo já possui uma manutenção em andamento.');
    this.name = 'VehicleAlreadyInMaintenanceException';
  }
}

export class InvalidMaintenanceDateException extends Error {
  constructor(message = 'Data de término não pode ser anterior à data de início.') {
    super(message);
    this.name = 'InvalidMaintenanceDateException';
  }
}

export class InvalidMoneyAmountException extends Error {
  constructor(message = 'O valor monetário não pode ser negativo.') {
    super(message);
    this.name = 'InvalidMoneyAmountException';
  }
}
