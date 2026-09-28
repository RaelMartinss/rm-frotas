import { SetMetadata } from '@nestjs/common';

export const IS_IDEMPOTENT_KEY = 'isIdempotent';

/**
 * Decorator para marcar endpoints que exigem suporte a idempotência.
 * Quando o cliente enviar o header `Idempotency-Key`, o IdempotencyInterceptor
 * garantirá que requisições duplicadas ou concorrentes sejam tratadas corretamente.
 */
export const Idempotent = () => SetMetadata(IS_IDEMPOTENT_KEY, true);
