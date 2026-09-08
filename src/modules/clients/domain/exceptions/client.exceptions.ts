export class ClientNotFoundException extends Error {
  constructor(message = 'Cliente não encontrado.') {
    super(message);
    this.name = 'ClientNotFoundException';
  }
}

export class ClientDocumentAlreadyExistsException extends Error {
  constructor(message = 'Já existe um cliente cadastrado com este CNPJ/CPF.') {
    super(message);
    this.name = 'ClientDocumentAlreadyExistsException';
  }
}

export class ClientSuspendedOrCancelledException extends Error {
  constructor(message = 'Acesso bloqueado: a empresa contratante está suspensa ou cancelada.') {
    super(message);
    this.name = 'ClientSuspendedOrCancelledException';
  }
}

export class ClientAlreadyHasFleetManagerException extends Error {
  constructor(message = 'Este cliente já possui um Gestor de Frota (FLEET_MANAGER) cadastrado.') {
    super(message);
    this.name = 'ClientAlreadyHasFleetManagerException';
  }
}

export class CrossClientAccessDeniedException extends Error {
  constructor(message = 'Acesso negado: você não tem permissão para acessar ou modificar recursos de outro cliente.') {
    super(message);
    this.name = 'CrossClientAccessDeniedException';
  }
}
