import { UnauthorizedException } from '@nestjs/common';

export class SessionRevokedException extends UnauthorizedException {
  constructor(sessionId?: string) {
    super(sessionId ? `Sessão ${sessionId} revogada. Faça login novamente.` : 'Sessão revogada. Faça login novamente.');
  }
}
