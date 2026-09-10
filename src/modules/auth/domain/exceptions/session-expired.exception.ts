import { UnauthorizedException } from '@nestjs/common';

export class SessionExpiredException extends UnauthorizedException {
  constructor(sessionId?: string) {
    super(sessionId ? `Sessão ${sessionId} expirada. Faça login novamente.` : 'Sessão expirada. Faça login novamente.');
  }
}
