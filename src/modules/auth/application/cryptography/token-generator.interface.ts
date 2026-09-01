export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface ITokenGenerator {
  generate(payload: TokenPayload): Promise<{ accessToken: string }>;
}
