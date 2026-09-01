import type { ITokenGenerator, TokenPayload } from '../application/cryptography/token-generator.interface';

export class FakeTokenGenerator implements ITokenGenerator {
  async generate(payload: TokenPayload): Promise<{ accessToken: string }> {
    return {
      accessToken: JSON.stringify({ ...payload, fakeToken: true }),
    };
  }
}
