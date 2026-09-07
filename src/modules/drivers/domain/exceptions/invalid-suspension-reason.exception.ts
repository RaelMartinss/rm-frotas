export class InvalidSuspensionReasonException extends Error {
  constructor(message?: string) {
    super(
      message ||
        'Para o motivo "OUTRO", é obrigatório fornecer detalhes da justificativa.',
    );
    this.name = 'InvalidSuspensionReasonException';
  }
}
