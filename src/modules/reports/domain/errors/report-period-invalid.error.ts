export class ReportPeriodInvalidError extends Error {
  readonly code = 'REPORT_PERIOD_INVALID';

  constructor(message: string = 'Período do relatório inválido. Deve ser no máximo 366 dias e com from <= to.') {
    super(message);
    this.name = 'ReportPeriodInvalidError';
  }
}
