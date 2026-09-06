import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../../application/cryptography/token-generator.interface';

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    const isProd = configService.get<string>('NODE_ENV') === 'production';
    if (isProd && (!secret || secret === 'default-secret-key')) {
      throw new Error(
        'FATAL: JWT_SECRET deve ser configurado com uma chave forte e segura em ambiente de produção.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'default-secret-key',
    });
  }

  async validate(payload: TokenPayload): Promise<UserPayload> {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}