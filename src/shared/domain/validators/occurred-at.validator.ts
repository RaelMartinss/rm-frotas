import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Valida a data de ocorrência (`occurredAt`) de eventos offline/online.
 * Regras da especificação:
 * - Não pode estar mais de 5 minutos no futuro (tolerância para drift de relógio).
 * - Não pode ser mais antiga do que 30 dias.
 * - Se ausente, retorna a data/hora atual (compatibilidade com clientes antigos).
 */
export function validateOccurredAt(occurredAtStr?: string | Date | null): Date {
  if (!occurredAtStr) {
    return new Date();
  }

  const date = occurredAtStr instanceof Date ? occurredAtStr : new Date(occurredAtStr);
  if (isNaN(date.getTime())) {
    throw new UnprocessableEntityException('Data de ocorrência inválida (formato ISO 8601 esperado).');
  }

  const now = Date.now();
  const maxFuture = now + 5 * 60 * 1000; // tolerância de 5 minutos no futuro
  const maxPast = now - 30 * 24 * 60 * 60 * 1000; // tolerância de até 30 dias no passado

  if (date.getTime() > maxFuture) {
    throw new UnprocessableEntityException(
      'A data de ocorrência (occurredAt) não pode estar mais de 5 minutos no futuro.',
    );
  }

  if (date.getTime() < maxPast) {
    throw new UnprocessableEntityException(
      'A data de ocorrência (occurredAt) não pode ser mais antiga que 30 dias.',
    );
  }

  return date;
}
