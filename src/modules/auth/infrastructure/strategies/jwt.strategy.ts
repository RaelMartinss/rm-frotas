import { Injectable } from '@nestjs/common';
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
    });
  }

  async validate(payload: TokenPayload): Promise<UserPayload> {
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