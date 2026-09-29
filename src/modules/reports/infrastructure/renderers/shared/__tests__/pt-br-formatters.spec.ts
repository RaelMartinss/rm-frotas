import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatKm,
  formatPercent,
  formatDate,
  formatDateTime,
} from '../pt-br-formatters';

describe('pt-br-formatters', () => {
  it('deve formatar moeda BRL com espaço não-quebrável', () => {
    const formatted = formatCurrency(12500.5);
    expect(formatted).toBe('R$\u00A012.500,50');
    expect(formatCurrency(0)).toBe('R$\u00A00,00');
    expect(formatCurrency('350.25')).toBe('R$\u00A0350,25');
    expect(formatCurrency(null)).toBe('R$\u00A00,00');
  });

  it('deve formatar quilometragem inteira', () => {
    expect(formatKm(84210)).toBe('84.210 km');
    expect(formatKm(0)).toBe('0 km');
    expect(formatKm(null)).toBe('0 km');
  });

  it('deve formatar percentuais com sinal explícito e hífen ASCII comum para negativos', () => {
    expect(formatPercent(29.94)).toBe('+29,9%');
    expect(formatPercent(-4.21)).toBe('-4,2%'); // Hífen comum ASCII (-) e não U+2212
    expect(formatPercent(-4.21).charCodeAt(0)).toBe(45); // ASCII 45 '-'
    expect(formatPercent(0)).toBe('0,0%');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });

  it('deve formatar datas simples no fuso America/Sao_Paulo', () => {
    expect(formatDate('2026-09-01')).toBe('01/09/2026');
    expect(formatDate('2026-09-28')).toBe('28/09/2026');
  });

  it('deve formatar data e hora com fuso de São Paulo', () => {
    const utcDate = new Date('2026-09-28T23:30:00.000Z'); // 20:30 em Brasília (UTC-3)
    const formatted = formatDateTime(utcDate);
    expect(formatted).toContain('28/09/2026');
    expect(formatted).toContain('20:30');
  });
});
