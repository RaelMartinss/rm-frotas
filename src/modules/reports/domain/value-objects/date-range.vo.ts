import { ReportPeriodInvalidError } from '../errors/report-period-invalid.error';

export class DateRange {
  readonly from: string; // YYYY-MM-DD
  readonly to: string;   // YYYY-MM-DD
  readonly start: Date;
  readonly end: Date;
  readonly days: number;

  private constructor(from: string, to: string, start: Date, end: Date, days: number) {
    this.from = from;
    this.to = to;
    this.start = start;
    this.end = end;
    this.days = days;
  }

  static create(from: string, to: string): DateRange {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
      throw new ReportPeriodInvalidError('Formato de data inválido. Use YYYY-MM-DD.');
    }

    const [fromY, fromM, fromD] = from.split('-').map(Number);
    const [toY, toM, toD] = to.split('-').map(Number);

    // Validação de calendário no fuso America/Sao_Paulo (-03:00)
    const startDate = new Date(`${from}T00:00:00.000-03:00`);
    const endDate = new Date(`${to}T23:59:59.999-03:00`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ReportPeriodInvalidError('Data inválida fornecida.');
    }

    // Calcula diferença em dias (meio-dia UTC evita bugs de horário de verão)
    const fromUtc = Date.UTC(fromY, fromM - 1, fromD);
    const toUtc = Date.UTC(toY, toM - 1, toD);

    if (fromUtc > toUtc) {
      throw new ReportPeriodInvalidError('Data inicial (from) deve ser menor ou igual à data final (to).');
    }

    const diffDays = Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 366) {
      throw new ReportPeriodInvalidError('O período máximo permitido para o relatório é de 366 dias.');
    }

    return new DateRange(from, to, startDate, endDate, diffDays);
  }

  getPreviousRange(): DateRange {
    const [fromY, fromM, fromD] = this.from.split('-').map(Number);
    const fromUtc = Date.UTC(fromY, fromM - 1, fromD);

    // previousTo é o dia imediatamente anterior a from
    const prevToUtc = fromUtc - 86400000;
    const prevFromUtc = prevToUtc - (this.days - 1) * 86400000;

    const prevToDate = new Date(prevToUtc);
    const prevFromDate = new Date(prevFromUtc);

    const prevToStr = prevToDate.toISOString().slice(0, 10);
    const prevFromStr = prevFromDate.toISOString().slice(0, 10);

    return DateRange.create(prevFromStr, prevToStr);
  }
}
