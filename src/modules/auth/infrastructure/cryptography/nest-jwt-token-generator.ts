import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenGenerator,
  TokenPayload,
} from '../../application/cryptography/token-generator.interface';

@Injectable()
export class NestJwtTokenGenerator implements ITokenGenerator {
  constructor(private readonly jwtService: JwtService) {}

  async generate(payload: TokenPayload): Promise<{ accessToken: string }> {
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
