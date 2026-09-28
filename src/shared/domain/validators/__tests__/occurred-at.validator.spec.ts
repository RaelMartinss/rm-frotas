import { describe, it, expect } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { validateOccurredAt } from '../occurred-at.validator';

describe('validateOccurredAt', () => {
  it('deve retornar a data atual quando o parâmetro for nulo ou indefinido', () => {
    const before = Date.now();
    const result = validateOccurredAt(undefined);
    const after = Date.now();

    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('deve aceitar uma data válida dentro da janela permitida', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = validateOccurredAt(twoDaysAgo.toISOString());

    expect(result.toISOString()).toBe(twoDaysAgo.toISOString());
  });

  it('deve aceitar uma data com até 4 minutos no futuro (tolerância para drift de relógio)', () => {
    const fourMinutesAhead = new Date(Date.now() + 4 * 60 * 1000);
    const result = validateOccurredAt(fourMinutesAhead.toISOString());

    expect(result.getTime()).toBe(fourMinutesAhead.getTime());
  });

  it('deve lançar 422 (UnprocessableEntityException) se a data estiver mais de 5 minutos no futuro', () => {
    const tenMinutesAhead = new Date(Date.now() + 10 * 60 * 1000);

    expect(() => validateOccurredAt(tenMinutesAhead.toISOString())).toThrow(
      UnprocessableEntityException,
    );
  });

  it('deve lançar 422 (UnprocessableEntityException) se a data for mais antiga que 30 dias', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

    expect(() => validateOccurredAt(thirtyOneDaysAgo.toISOString())).toThrow(
      UnprocessableEntityException,
    );
  });

  it('deve lançar 422 se a string fornecida for uma data inválida', () => {
    expect(() => validateOccurredAt('data-invalida-xyz')).toThrow(
      UnprocessableEntityException,
    );
  });
});
