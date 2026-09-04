import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/v1/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário no sistema' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  async register(@Body() body: RegisterDto) {
    const user = await this.registerUserUseCase.execute(body);

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      createdAt: user.getCreatedAt(),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e obter token JWT de acesso' })
  @ApiResponse({
    status: 200,
    description:
      'Autenticação realizada com sucesso (retorna accessToken e grava cookie HttpOnly).',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.loginUseCase.execute(body);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: REFRESH_COOKIE_PATH,
    });

    return {
      accessToken,
      user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token utilizando o cookie de refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Novo accessToken emitido com sucesso e cookie de refresh rotacionado.',
  })
  @ApiResponse({ status: 401, description: 'Refresh token ausente, inválido ou expirado.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const token = tokenFromCookie || body?.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Token de atualização não encontrado.');
    }

    const { accessToken, refreshToken: newRefreshToken, user } =
      await this.refreshTokenUseCase.execute({ refreshToken: token });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: REFRESH_COOKIE_PATH,
    });

    return {
      accessToken,
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar sessão e limpar cookie de refresh token' })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso.' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    });

    return { message: 'Desconectado com sucesso.' };
  }
}