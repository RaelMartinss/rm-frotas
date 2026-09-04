import type {
  GeneratedTokens,
  ITokenGenerator,
  TokenPayload,
} from '../application/cryptography/token-generator.interface';

export class FakeTokenGenerator implements ITokenGenerator {
  async generate(payload: TokenPayload): Promise<GeneratedTokens> {
    return {
      accessToken: JSON.stringify({ ...payload, fakeToken: true, type: 'access' }),
      refreshToken: JSON.stringify({ ...payload, fakeToken: true, type: 'refresh' }),
    };
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    const parsed = JSON.parse(token);
    return {
      sub: parsed.sub,
      email: parsed.email,
      role: parsed.role,
    };
  }
}

