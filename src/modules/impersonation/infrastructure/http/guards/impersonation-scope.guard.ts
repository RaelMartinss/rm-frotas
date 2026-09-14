import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserPayload } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { IImpersonationSessionsRepository } from '../../../domain/repositories/impersonation-sessions.repository.interface';

@Injectable()
export class ImpersonationScopeGuard implements CanActivate {
  constructor(
    private readonly sessionsRepository: IImpersonationSessionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (!user || !user.impersonating) {
      return true;
    }

    // Valida se a sessão de impersonation ainda é válida e não foi encerrada
    if (user.impersonationSessionId) {
      const session = await this.sessionsRepository.findById(user.impersonationSessionId);
      if (!session || !session.isActive()) {
        throw new UnauthorizedException('Sessão de suporte expirada ou encerrada.');
      }
    }

    // Permite a rota de encerramento da própria sessão de suporte mesmo sendo POST
    const isEndImpersonationRoute =
      request.url.includes('/support/impersonate/end') &&
      request.method.toUpperCase() === 'POST';

    // Se o escopo for READ_ONLY, bloqueia qualquer escrita (POST, PUT, PATCH, DELETE)
    if (!isEndImpersonationRoute && user.scope === 'READ_ONLY') {
      const allowedMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (!allowedMethods.includes(request.method.toUpperCase())) {
        throw new ForbiddenException(
          'Acesso negado: Sessão de suporte em modo somente leitura (READ_ONLY). Modificações não são permitidas.',
        );
      }
    }

    // Força o escopo do cliente alvo em toda a requisição
    if (user.targetClientId) {
      user.clientId = user.targetClientId;
      if (request.query && request.query.clientId) {
        request.query.clientId = user.targetClientId;
      }
    }

    return true;
  }
}
