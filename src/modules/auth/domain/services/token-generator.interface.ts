export interface TokenPayload {
  sub: string;     // user.id
  email: string;
  role: string;
}

export interface ITokenGenerator {
  generate(payload: TokenPayload): Promise<{ accessToken: string }>;
}