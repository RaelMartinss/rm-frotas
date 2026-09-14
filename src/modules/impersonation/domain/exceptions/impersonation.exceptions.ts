export class ClientCancelledImpersonationException extends Error {
  constructor() {
    super('Não é possível iniciar sessão de suporte para um cliente com contrato cancelado.');
    this.name = 'ClientCancelledImpersonationException';
  }
}

export class ImpersonationSessionNotFoundException extends Error {
  constructor() {
    super('Sessão de suporte não encontrada ou já encerrada.');
    this.name = 'ImpersonationSessionNotFoundException';
  }
}

export class UnauthorizedImpersonationException extends Error {
  constructor() {
    super('Apenas usuários com perfil SUPER_ADMIN podem acessar recursos de suporte.');
    this.name = 'UnauthorizedImpersonationException';
  }
}
