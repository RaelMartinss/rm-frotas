import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  GeneratedTokens,
  ITokenGenerator,
  TokenPayload,
} from '../../application/cryptography/token-generator.interface';

@Injectable()
export class NestJwtTokenGenerator implements ITokenGenerator {
  private readonly refreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      `${this.configService.get<string>('JWT_SECRET', 'default-secret-key')}_refresh`;
  }

  async generate(payload: TokenPayload): Promise<GeneratedTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    } catch {
      throw new UnauthorizedException('Token de atualização inválido ou expirado.');
    }
  }
}

