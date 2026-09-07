export class InvalidSuspensionDateRangeException extends Error {
  constructor(message?: string) {
    super(
      message ||
        'A data de retorno ou encerramento da suspensão informada é inválida.',
    );
    this.name = 'InvalidSuspensionDateRangeException';
  }
}
