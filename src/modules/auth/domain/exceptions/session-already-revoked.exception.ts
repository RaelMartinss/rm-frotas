import { ConflictException } from '@nestjs/common';

export class SessionAlreadyRevokedException extends ConflictException {
  constructor(sessionId?: string) {
    super(sessionId ? `Sessão ${sessionId} já se encontra revogada.` : 'Sessão já se encontra revogada.');
  }
}
