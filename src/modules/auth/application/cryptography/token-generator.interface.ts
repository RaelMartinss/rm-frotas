export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  clientId?: string | null;
  mustChangePassword?: boolean;
  impersonating?: boolean;
  impersonationSessionId?: string;
  targetClientId?: string;
  scope?: 'READ_ONLY' | 'READ_WRITE';
}

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenGenerator {
  generate(payload: TokenPayload): Promise<GeneratedTokens>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}

