export class ReportFormatNotSupportedError extends Error {
  readonly code = 'REPORT_FORMAT_NOT_SUPPORTED';

  constructor(format: string) {
    super(`Formato de relatório não suportado: ${format}`);
    this.name = 'ReportFormatNotSupportedError';
  }
}
