import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestContextService } from '../../../../shared/observability/request-context.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly requestContextService?: RequestContextService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    if (result) {
      const req = context.switchToHttp().getRequest();
      if (req.user && this.requestContextService) {
        this.requestContextService.update({
          userId: req.user.userId,
          clientId: req.user.clientId ?? undefined,
        });
      }
    }
    return result;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token de autenticação inválido ou ausente.');
    }
    return user;
  }
}