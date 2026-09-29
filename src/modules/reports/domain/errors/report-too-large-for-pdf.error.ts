export class ReportTooLargeForPdfError extends Error {
  readonly code = 'REPORT_TOO_LARGE_FOR_PDF';

  constructor(rowCount: number, maxRows: number) {
    super(
      `O relatório possui ${rowCount} veículos, excedendo o limite de ${maxRows} para exportação em PDF. Utilize o formato CSV ou reduza o período selecionado.`,
    );
    this.name = 'ReportTooLargeForPdfError';
  }
}
