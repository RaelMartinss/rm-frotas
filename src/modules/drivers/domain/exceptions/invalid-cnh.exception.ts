export class InvalidCnhException extends Error {
  constructor(reason: string) {
    super(`CNH inválida: ${reason}`);
    this.name = 'InvalidCnhException';
  }
}