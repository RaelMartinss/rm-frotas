export class InvalidDriverStatusTransitionException extends Error {
  constructor(from: string, to: string) {
    super(`Não é possível alterar o status do motorista de ${from} para ${to}.`);
    this.name = 'InvalidDriverStatusTransitionException';
  }
}