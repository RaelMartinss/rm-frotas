import { describe, expect, it } from 'vitest';
import { DateRange } from '../date-range.vo';
import { ReportPeriodInvalidError } from '../../errors/report-period-invalid.error';

describe('DateRange Value Object', () => {
  it('deve criar um DateRange válido dentro dos limites', () => {
    const range = DateRange.create('2026-09-01', '2026-09-28');

    expect(range.from).toBe('2026-09-01');
    expect(range.to).toBe('2026-09-28');
    expect(range.days).toBe(28);
    expect(range.start.toISOString()).toBe(new Date('2026-09-01T00:00:00.000-03:00').toISOString());
    expect(range.end.toISOString()).toBe(new Date('2026-09-28T23:59:59.999-03:00').toISOString());
  });

  it('deve permitir exatamente 366 dias (limite máximo)', () => {
    // Ano bissexto 2024: 2024-01-01 a 2024-12-31 = 366 dias
    const range = DateRange.create('2024-01-01', '2024-12-31');
    expect(range.days).toBe(366);
  });

  it('deve lançar erro REPORT_PERIOD_INVALID quando from > to', () => {
    expect(() => DateRange.create('2026-09-28', '2026-09-01')).toThrow(ReportPeriodInvalidError);
  });

  it('deve lançar erro quando o período exceder 366 dias', () => {
    // 367 dias
    expect(() => DateRange.create('2025-01-01', '2026-01-03')).toThrow(ReportPeriodInvalidError);
  });

  it('deve lançar erro para formatos de data inválidos', () => {
    expect(() => DateRange.create('01/09/2026', '28/09/2026')).toThrow(ReportPeriodInvalidError);
    expect(() => DateRange.create('invalido', '2026-09-28')).toThrow(ReportPeriodInvalidError);
  });

  it('deve calcular corretamente o período anterior (mesma duração terminando no dia anterior)', () => {
    // Exemplo da spec: 2026-09-01 a 2026-09-28 (28 dias) -> anterior: 2026-08-04 a 2026-08-31
    const current = DateRange.create('2026-09-01', '2026-09-28');
    const previous = current.getPreviousRange();

    expect(previous.from).toBe('2026-08-04');
    expect(previous.to).toBe('2026-08-31');
    expect(previous.days).toBe(28);
  });
});
