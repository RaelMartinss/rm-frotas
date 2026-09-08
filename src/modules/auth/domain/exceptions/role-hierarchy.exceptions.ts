export class SelfRoleEscalationException extends Error {
  constructor(message = 'Não é permitido alterar ou escalar o seu próprio papel de acesso.') {
    super(message);
    this.name = 'SelfRoleEscalationException';
  }
}

export class UnauthorizedRoleCreationException extends Error {
  constructor(message = 'Você não possui permissão para criar usuários com este papel.') {
    super(message);
    this.name = 'UnauthorizedRoleCreationException';
  }
}

export class UnauthorizedUserManagementException extends Error {
  constructor(message = 'Você não possui permissão para gerenciar este usuário.') {
    super(message);
    this.name = 'UnauthorizedUserManagementException';
  }
}

export class MustChangePasswordException extends Error {
  constructor(message = 'É obrigatório realizar a troca de senha antes de acessar as funcionalidades do sistema.') {
    super(message);
    this.name = 'MustChangePasswordException';
  }
}

export class UserNotFoundException extends Error {
  constructor(message = 'Usuário não encontrado.') {
    super(message);
    this.name = 'UserNotFoundException';
  }
}

export class UserEmailAlreadyExistsException extends Error {
  constructor(message = 'Já existe um usuário cadastrado com este e-mail.') {
    super(message);
    this.name = 'UserEmailAlreadyExistsException';
  }
}
