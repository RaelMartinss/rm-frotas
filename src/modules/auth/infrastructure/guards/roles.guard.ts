import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../domain/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserPayload } from '../strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se nenhuma role foi especificada no endpoint, o acesso é liberado por padrão
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (!user || !user.role) {
      throw new ForbiddenException('Acesso negado: Perfil de usuário não identificado.');
    }

    const hasRole = requiredRoles.some((role) => role === user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Acesso negado: Você não tem permissão para acessar este recurso.',
      );
    }

    return true;
  }
}