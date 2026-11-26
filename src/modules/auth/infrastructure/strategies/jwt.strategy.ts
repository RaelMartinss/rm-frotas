import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../../application/cryptography/token-generator.interface';
import { RequestContextService } from '../../../../shared/observability/request-context.service';

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  clientId?: string | null;
  mustChangePassword?: boolean;
  impersonating?: boolean;
  impersonationSessionId?: string;
  targetClientId?: string;
  scope?: 'READ_ONLY' | 'READ_WRITE';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly requestContextService?: RequestContextService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    const isProd = configService.get<string>('NODE_ENV') === 'production';
    const isCI = !!configService.get<string>('CI');
    if (isProd && !isCI && (!secret || secret === 'default-secret-key')) {
      throw new Error(
        'FATAL: JWT_SECRET deve ser configurado com uma chave forte e segura em ambiente de produção.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          const authHeader = req?.headers?.authorization;
          if (authHeader && typeof authHeader === 'string') {
            // Remove prefixo(s) 'Bearer ' repetidos ou espaços extras (ex: token colado com 'Bearer ...' no Swagger)
            const token = authHeader.replace(/^(Bearer\s+)+/i, '').trim();
            if (token) return token;
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret || 'default-secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: TokenPayload): Promise<UserPayload> {
    if (payload.mustChangePassword) {
      const pathUrl = String(req?.originalUrl || req?.url || '').split('?')[0];
      const allowedWhilePendingPasswordChange =
        pathUrl.endsWith('/auth/change-password') ||
        pathUrl.endsWith('/me/password') ||
        pathUrl.endsWith('/auth/logout') ||
        pathUrl.endsWith('/auth/logout-all-devices') ||
        pathUrl.endsWith('/me') ||
        pathUrl.endsWith('/driver-portal/device/sync');

      if (!allowedWhilePendingPasswordChange) {
        throw new ForbiddenException(
          'Redefinição de senha obrigatória pendente. Altere sua senha temporária para continuar.',
        );
      }
    }
    const user: UserPayload = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      clientId: payload.impersonating ? payload.targetClientId : payload.clientId,
      mustChangePassword: payload.mustChangePassword,
      impersonating: payload.impersonating ?? false,
      impersonationSessionId: payload.impersonationSessionId,
      targetClientId: payload.targetClientId,
      scope: payload.scope,
    };

    if (this.requestContextService) {
      this.requestContextService.update({
        userId: user.userId,
        clientId: user.clientId ?? undefined,
      });
    }

    return user;
  }
}