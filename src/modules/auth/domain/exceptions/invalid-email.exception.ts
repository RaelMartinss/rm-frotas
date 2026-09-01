export class InvalidEmailException extends Error {
  constructor(email?: string) {
    const message = email
      ? `O e-mail '${email}' é inválido.`
      : 'Endereço de e-mail inválido.';
    super(message);
    this.name = 'InvalidEmailException';
  }
}